
import { BluetoothDevice } from '../../device/index';
import { ISendCommand, IMessageFromDevice } from '../../index';
import {
  AccumulateMessageProps,
  CommandFunctions,
  ConfigureBluetooth,
  ConverterMessageFromDeviceProps,
  IPowerTransponder,
  IProtocolBluetooth,
  Protocols,
  RSSIRange,
} from '../models/IProtocol';
import { uniqueId } from 'lodash';
import { mergeMessagesFromDevice } from '../models/operationsMessage';
import { prepareCommand } from '../models/prepareCommand';

export class BRI implements IProtocolBluetooth {
  private deviceConnected: BluetoothDevice | undefined = undefined;

  private rssiRange: RSSIRange = {
    weak: -128,
    strong: 0,
  };

  private powerTransponder: IPowerTransponder = {
    min: 15,
    max: 30,
  };

  private accumulatedMessages: AccumulateMessageProps[] = [];

  constructor() { }

  typeDeviceProtocol(): Protocols {
    return 'bri';
  }

  getConfigureBluetooth(): ConfigureBluetooth {
    return {
      delimiter: '\r\n',
      secureSocket: false,
      charset: 'ascii',
    };
  }

  setDevice(device: BluetoothDevice): void {
    this.deviceConnected = device;
  }

  getDevice(): BluetoothDevice | undefined {
    return this.deviceConnected;
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
        const configReport =
          'ATTRIB CHKSUM=OFF\n ATTRIB ECHO=ON\n ATTRIB TTY=OFF\n READ STOP';
        const configAntenna = `ATTRIB SCHEDOPT=1\n ATTRIB DRM=ON\n ATTRIB IDTRIES=4\n ATTRIB ANTTRIES=2\n ATTRIB INITIALQ=4\n ATTRIB NOTAGRPT=1`;

        let session;
        let power;
        if (data?.readerConfig) {
          session = Number(data.readerConfig.querySession.slice(1));
          power = data.power;
        }
        const configAntennaMandatory = `ATTRIB SESSION=${session ?? 1
          }\n ATTRIB IDREPORT=1\n ATTRIB FS=${power ?? 30}db`;

        return `${configReport}\n${configAntenna}\n${configAntennaMandatory}`;
      },
      inventory: () => {
        return `ATTRIB FS=${data?.power ?? 30}db\nREAD RSSI REPORT=EVENTALL`;
      },
      battery: () => {
        return '';
      },
      sound: () => {
        return '';
      },
      autoplay: () => {
        return `ATTRIB FS=${data?.power ?? 30}db\nREAD RSSI REPORT=EVENTALL`;
      },
      abort: () => {
        return 'READ STOP';
      },
      readForWrite: () => {
        return '';
      },
      write: () => {
        return '';
      },
      getTagsInBatch: () => {
        return '';
      },
      disconnect: () => {
        return '';
      },
    };

    const command = commands[type]();
    await this.getDevice()?.write(prepareCommand(command));
  }

  converterMessageFromDevice({
    message,
  }: ConverterMessageFromDeviceProps): IMessageFromDevice | undefined {
    if (message.startsWith('EVT:')) {
      if (message.startsWith('EVT:TRIGGER')) {
        const isPull = message.includes('TRIGPULL');
        return {
          command: 'trigger',
          triggerIsPressed: isPull,
        };
      }
      if (message.startsWith('EVT:BATTERY')) {
        const isCharged = message.includes('CHARGED');
        const isOperational = message.includes('OPERATIONAL');
        const isLow = message.includes('LOW');
        return {
          command: 'battery',
          battery: {
            isCharging: false,
            level: isCharged ? 100 : isOperational ? 79 : isLow ? 20 : 0,
          },
        };
      }
      if (message.startsWith('EVT:TAG')) {
        // Verificar se a string contém um EPC válido (24 caracteres hexadecimais)
        const regexEpcValido = /H([A-F0-9]{24})/;
        const matchEpcValido = message.match(regexEpcValido);

        // Extrair RSSI
        const regexRssi = /-([\d.]+)/;
        const matchRssi = message.match(regexRssi);

        if (matchEpcValido && matchRssi) {
          const epc = matchEpcValido[1] ?? '';
          const rssi = String(Math.round(parseFloat(matchRssi[1] ?? '0')));

          return {
            command: 'inventory',
            tags: [{ epc, rssi }],
          };
        }
      }
    }
    return undefined;
  }

  accumulateMessage(message: IMessageFromDevice): void {
    this.accumulatedMessages.push({
      id: uniqueId('bri'),
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
