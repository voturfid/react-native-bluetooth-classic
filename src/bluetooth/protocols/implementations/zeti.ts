import { Platform } from 'react-native';
import {
  ISendCommand,
  IMessageFromDevice,
  IEpcProps,
  QuerySessionProps,
  QueryTargetProps,
} from '../../index';
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
import { prepareCommand } from '../models/prepareCommand';
import { BluetoothDevice } from '../../device/index';
import { uniqueId } from 'lodash';
import { mergeMessagesFromDevice } from '../models/operationsMessage';
import { ReadModeReport } from '../../../hooks/deviceInteraction/controlTags';

type Notification =
  | 'BatteryEvent'
  | 'TemperatureEvent'
  | 'TriggerEvent'
  | 'StartOperation'
  // | 'StopOperation'
  | 'OperEndSummary';

type BuildNotificationMessageProps = {
  messageRaw: string;
  readModeReport: ReadModeReport;
};

type BuildNotification = {
  [key in Notification]: (
    message: BuildNotificationMessageProps
  ) => IMessageFromDevice | undefined;
};

export class ZETI implements IProtocolBluetooth {
  private deviceConnected: BluetoothDevice | undefined = undefined;

  private rssiRange: RSSIRange = {
    weak: -78,
    strong: -23,
  };

  private powerTransponder: IPowerTransponder = {
    min: 10,
    max: 30,
  };

  private msgNotificationReading: string;
  private epcToWrite: string | undefined;
  private accumulatedMessages: AccumulateMessageProps[] = [];
  private timeoutReadForWrite: NodeJS.Timeout | undefined;
  private timeoutForWrite: NodeJS.Timeout | undefined;

  constructor() {
    this.msgNotificationReading = '';
    this.epcToWrite = undefined;
    this.timeoutReadForWrite = undefined;
    this.timeoutForWrite = undefined;
  }

  setDevice(device: BluetoothDevice): void {
    this.deviceConnected = device;
  }
  getDevice(): BluetoothDevice | undefined {
    return this.deviceConnected;
  }

  typeDeviceProtocol(): Protocols {
    return 'zeti';
  }

  getConfigureBluetooth(): ConfigureBluetooth {
    return {
      delimiter: '\r\n',
      secureSocket: false,
      charset: Platform.OS === 'ios' ? 1536 : 'utf-8',
      rfcomm: '2AD8A392-0E49-E52C-A6D2-60834C012263',
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
        const region = 'setregulatory .c BRA';
        const notifications = 'protocolconfig .ig .io .is .it .ib';

        let sessionAndTarget;
        if (data?.readerConfig) {
          const [query, target] = this.extractSessionAndTarget(
            data.readerConfig.querySession,
            data.readerConfig.queryTarget
          );
          sessionAndTarget = `qp .i ${query} .j ${target}`;
        }

        const connect = 'cn';
        return `${connect}\n${region}\n${notifications}\n${sessionAndTarget ? sessionAndTarget : ''
          }`;
      },
      inventory: () => {
        const configStartTrigger = 'st .d';
        const configStopTrigger = 'ot .d';

        const command = `inventory .batchmode disable .power ${data?.power ? data?.power * 10 : this.powerTransponder.max * 10
          }`;

        return `${configStartTrigger}\n${configStopTrigger}\n${command}`;
      },
      battery: () => 'getdeviceinfo .battery .temperature',
      sound: () =>
        `setattr .attnum 140 .atttype B .attvalue ${data?.sound ? '0' : '3'}`,
      autoplay: () => 'setstarttrigger .startonhandheldtrigger .triggertype 0',
      abort: () => 'abort',
      readForWrite: () => {
        const configStopTrigger = 'ot .d\not .ip .ec .tc 1';
        const command = `rd .power ${this.powerTransponder.min * 10}`;

        this.timeoutReadForWrite = setTimeout(async () => {
          await this.sendCommand({ type: 'abort' });
        }, 1000 * 2); // 2s

        return `${configStopTrigger}\n${command}`;
      },
      write: () => {
        this.epcToWrite = data?.writeEpc;

        this.timeoutForWrite = setTimeout(async () => {
          await this.sendCommand({ type: 'abort' });
        }, 1000 * 2); // 2s

        return `write .f 0002 .b epc .power ${this.powerTransponder.min * 10
          } .data ${data?.writeEpc}`;
      },
      getTagsInBatch: () => 'tg\ntp',
      disconnect: () => '',
    };

    const command = commands[type]();
    await this.getDevice()?.write(prepareCommand(command));
  }

  converterMessageFromDevice({
    message,
    readModeReport,
  }: ConverterMessageFromDeviceProps): IMessageFromDevice | undefined {
    const messageParts = this.getPartsOfMessage(message);
    const notificationRaw = messageParts[0];

    if (notificationRaw && notificationRaw.startsWith('Notification')) {
      const notificationKeyValue = notificationRaw.split(':');
      const notification = notificationKeyValue[1] as Notification;
      if (notification) {
        const buildNotificationFunction = this.buildNotification[notification];
        if (buildNotificationFunction) {
          return buildNotificationFunction({
            messageRaw: message,
            readModeReport,
          });
        }
      }
    } else if (message.startsWith(',,') && readModeReport !== 'standby') {
      if (readModeReport === 'write' || readModeReport === 'readForRecorder') {
        this.msgNotificationReading = this.msgNotificationReading.concat(
          `${message}\n`
        );
        return;
      }

      const messageParts = this.getPartsOfMessage(message);
      const epc = messageParts[2] ?? '';
      const rssi = messageParts[4] ?? '0';
      const epcProps = { epc, rssi };
      return this.buildReadMessage([epcProps], readModeReport);
    }
    return undefined;
  }

  private buildNotification: BuildNotification = {
    BatteryEvent: ({ messageRaw }) => {
      const message = this.getPartsOfMessage(messageRaw);
      const level = this.getValueOfMessage(message[2], 1) || 0;
      const isCharging = this.getValueOfMessage(message[3], 1) || false;
      return {
        command: 'battery',
        battery: {
          level: Number(level),
          isCharging: isCharging === 'true',
        },
      };
    },
    TemperatureEvent: ({ messageRaw }) => {
      const message = this.getPartsOfMessage(messageRaw);
      const temperature = this.getValueOfMessage(message[2], 1) || 0;
      return {
        command: 'temperature',
        temperature: Number(temperature),
      };
    },
    TriggerEvent: ({ messageRaw }) => {
      // Trigger 0 is pressed, else release
      const message = this.getPartsOfMessage(messageRaw);
      const triggerRaw = this.getValueOfMessage(message[1], 1) || 1;
      const triggerNumber = Number(triggerRaw);
      return {
        command: 'trigger',
        triggerIsPressed: triggerNumber === 0,
      };
    },
    StartOperation: ({ messageRaw }) => {
      this.msgNotificationReading = this.msgNotificationReading.concat(
        `${messageRaw}\n`
      );
      return undefined;
    },
    OperEndSummary: ({ messageRaw, readModeReport }) => {
      try {
        this.msgNotificationReading = this.msgNotificationReading.concat(
          `${messageRaw}`
        );

        const copyNotification = this.msgNotificationReading.slice();
        this.msgNotificationReading = '';

        const tags: IEpcProps[] = [];
        const lines = copyNotification.split('\n');
        let error: undefined | string;

        if (lines.length === 3 && readModeReport === 'write') {
          try {
            const messageError = this.getPartsOfMessage(lines[1] || '')[6];
            error = messageError === '' ? undefined : messageError;
          } catch (error) {
            console.log('Array position is not exist');
          }
        }

        if (lines.length >= 3) {
          for (let i = 1; i < lines.length - 1; i++) {
            // ignora primeira e ultima linha
            const line = lines[i]?.trim() || '';
            const message = this.getPartsOfMessage(line);
            const epc = message[2] || '';
            const rssi = message[4] || '0';
            const epcProps = { epc, rssi };
            tags.push(epcProps);
          }
        }

        if (lines.length === 2) {
          error = 'Transponder not found';
        }
        // console.log('Total tags:', tags.length, JSON.stringify(tags));

        return this.buildReadMessage(tags, readModeReport, error);
      } catch (error) {
        console.log('Error finish Summary reader', error);
        return undefined;
      }
    },
  };

  private getValueOfMessage(message?: string, index = 0) {
    return message?.split(':')[index];
  }
  private getPartsOfMessage(message: string): string[] {
    return message.split(',');
  }
  private extractSessionAndTarget(
    querySession: QuerySessionProps,
    queryTarget: QueryTargetProps
  ): number[] {
    const session = Number(querySession.slice(1));
    const target = queryTarget === 'a' ? 0 : 1;
    return [session, target];
  }

  private buildReadMessage = (
    tags: IEpcProps[],
    readModeReport: ReadModeReport,
    error?: string
  ): IMessageFromDevice => {
    if (readModeReport === 'readForRecorder') {
      clearTimeout(this.timeoutReadForWrite);
      return {
        command: 'read',
        tags,
        error,
      };
    }

    if (readModeReport === 'write') {
      clearTimeout(this.timeoutForWrite);
      const epcWrite = this.epcToWrite?.slice();
      this.epcToWrite = undefined;
      return {
        command: 'write',
        write: {
          epcRead: tags[0]?.epc,
          epcWrite,
        },
        error,
      };
    }

    return {
      command: 'inventory',
      tags,
    };
  };

  accumulateMessage(message: IMessageFromDevice): void {
    this.accumulatedMessages.push({
      id: uniqueId('zeti'),
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
