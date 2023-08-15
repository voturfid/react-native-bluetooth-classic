import { Platform } from 'react-native';
import { ISendCommand, IMessageFromDevice } from '../../index';
import {
  IProtocolBluetooth,
  IPowerTransponder,
  CommandFunctions,
  ConfigureBluetooth,
  AccumulateMessageProps,
  RSSIRange,
  ConverterMessageFromDeviceProps,
  Protocols,
} from '../models/IProtocol';
import { prepareCommand } from '../models/prepareCommand';
import { uniqueId } from 'lodash';
import { mergeMessagesFromDevice } from '../models/operationsMessage';
import { BluetoothDevice } from '../../device/index';

interface IResponseMessageRaw {
  CS: string;
  BP?: string;
  BC?: string;
  CH?: string;
  EP?: string;
  RI?: string;
  ER?: string;
  ME?: string;
}

interface IResponsePrepare extends Omit<IResponseMessageRaw, 'EP' | 'RI'> {
  EPCS?: {
    epc: string;
    rssi: string;
  }[];
}

type IResponseCSHeader = 'iv' | 'rd' | 'bl' | 'ws' | 'bc';

type IResponseConverted = {
  [key in IResponseCSHeader]: (
    responsePrepare: IResponsePrepare
  ) => IMessageFromDevice;
};

export class TSL implements IProtocolBluetooth {
  private deviceConnected: BluetoothDevice | undefined = undefined;

  private rssiRange: RSSIRange = {
    weak: -70,
    strong: -35,
  };

  private powerTransponder: IPowerTransponder = {
    min: 10,
    max: 29,
  };

  private accumulatedMessages: AccumulateMessageProps[] = [];

  constructor() { }

  setDevice(device: BluetoothDevice): void {
    this.deviceConnected = device;
  }
  getDevice(): BluetoothDevice | undefined {
    return this.deviceConnected;
  }

  typeDeviceProtocol(): Protocols {
    return 'tsl';
  }

  getConfigureBluetooth(): ConfigureBluetooth {
    return {
      delimiter: '\r\n\r\n',
      secureSocket: false,
      charset: Platform.OS === 'ios' ? 1536 : 'utf-8',
    };
  }

  getMinMaxPowerTransponder(): IPowerTransponder {
    return {
      min: this.powerTransponder.min,
      max: this.powerTransponder.max,
    };
  }

  getRSSIRange(): RSSIRange {
    return this.rssiRange;
  }

  async sendCommand({ type, data }: ISendCommand): Promise<void> {
    const commands: CommandFunctions = {
      configure: () => {
        let command = `.iv -sb epc -so 0000 -r on -o ${data?.power} -n -x`;
        if (data?.readerConfig) {
          command = `${command} -qs ${data.readerConfig.querySession} -qt ${data.readerConfig.queryTarget}`;
        }
        return command;
      },
      inventory: () => {
        let command = `.iv -sb epc -so 0000 -r on -o ${data?.power} -n -x`;
        if (data?.readerConfig) {
          command = `${command} -qs ${data.readerConfig.querySession} -qt ${data.readerConfig.queryTarget}`;
        }
        return command;
      },
      battery: () => '.bl',
      sound: () => `.al -x -v off -b ${data?.sound ? 'on' : 'off'}`,
      autoplay: () => '.ps -t 0',
      abort: () => '.ab',
      readForWrite: () =>
        `.rd -x -db epc -do 0000 -dl 06 -fs on -r on -o ${this.powerTransponder.min}`,
      write: () =>
        `.ws -x -da ${data?.writeEpc} -db epc -do 0002 -dl 06 -r on -o ${this.powerTransponder.min}`,
      getTagsInBatch: () => '',
      disconnect: () => '',
    };

    const command = commands[type]();
    await this.getDevice()?.write(prepareCommand(command));
  }

  converterMessageFromDevice({
    message,
  }: ConverterMessageFromDeviceProps): IMessageFromDevice | undefined {
    const lines = message.split('\r\n');
    const responsePrepare = lines.reduce((messageRaw, line, index, array) => {
      try {
        const [key, value] = line.split(':') as [
          key: keyof IResponseMessageRaw,
          value: string
        ];
        if (key && value) {
          if (key === 'EP') {
            const epc = value.trim();
            const rssi = array[index + 1]?.split(':')[1]?.trim() || '0';
            const epcData = { epc, rssi };
            messageRaw.EPCS
              ? messageRaw.EPCS.push(epcData)
              : (messageRaw.EPCS = [epcData]);
          } else if (key !== 'RI') {
            messageRaw[key] = value.trim();
          }
        }
      } finally {
        return messageRaw;
      }
    }, {} as IResponsePrepare);

    // console.log('Raw of Device', JSON.stringify(responsePrepare, null, 2));

    const responseMessageConverted: IResponseConverted = {
      iv: (responsePrepare) => ({
        command: 'inventory',
        tags: responsePrepare.EPCS,
        error: responsePrepare.ER ? responsePrepare.ME : undefined,
      }),
      rd: (responsePrepare) => ({
        command: 'read',
        tags: responsePrepare.EPCS,
        error: responsePrepare.ER ? responsePrepare.ME : undefined,
      }),
      bl: (responsePrepare) => ({
        command: 'battery',
        battery: {
          level: Number(responsePrepare.BP?.replace('%', '').trim()) || 0,
          isCharging: responsePrepare.CH !== 'Off',
        },
        error: responsePrepare.ER ? responsePrepare.ME : undefined,
      }),
      ws: (responsePrepare) => ({
        command: 'write',
        write: {
          epcRead: responsePrepare.EPCS
            ? responsePrepare.EPCS[0]?.epc
            : undefined,
          epcWrite: responsePrepare.CS.split(' ')[3] || undefined,
        },
        error: responsePrepare.ER ? responsePrepare.ME : undefined,
      }),
      bc: (responsePrepare) => ({
        command: 'barcode',
        barcode: responsePrepare.BC,
        error: responsePrepare.ER ? responsePrepare.ME : undefined,
      }),
    };

    const commandInCS = responsePrepare?.CS?.split(' ')[0]?.replace(
      '.',
      ''
    ) as IResponseCSHeader;

    const messageConvertedFunction = responseMessageConverted[commandInCS];

    if (!messageConvertedFunction) {
      return undefined;
    }

    return messageConvertedFunction(responsePrepare);
  }

  accumulateMessage(message: IMessageFromDevice): void {
    this.accumulatedMessages.push({
      id: uniqueId('tsl'),
      timestamp: new Date().getTime(),
      message,
    });
  }

  reportAccumulatedMessages(): IMessageFromDevice[] {
    const [mergedMessages, mergedIds] = mergeMessagesFromDevice([
      ...this.accumulatedMessages,
    ]);

    this.accumulatedMessages = this.accumulatedMessages.filter(
      (message) => !mergedIds.has(message.id)
    );

    return mergedMessages;
  }
}
