import { ReadModeReport } from "../../../hooks/deviceInteraction/controlTags";
import { IMessageFromDevice, ISendCommand } from "../../index";
import { BluetoothDevice, StandardOptions } from "../../device/index";

export interface ConfigureBluetooth extends StandardOptions {
  delimiter: string;
  secureSocket: boolean;
  charset: 1536 | 'utf-8' | 'ISO-8859-1' | 'ascii';
}

export type IPowerTransponder = {
  min: number;
  max: number;
};

export type RSSIRange = {
  weak: number;
  strong: number;
};

export type CommandFunctions = {
  [key in ISendCommand['type']]: () => string;
};

export type AccumulateMessageProps = {
  id: string;
  timestamp: number;
  message: IMessageFromDevice;
};

export type ConverterMessageFromDeviceProps = {
  message: string;
  readModeReport: ReadModeReport;
};

export type Protocols = 'tsl' | 'zeti' | 'bri';

export interface IProtocolBluetooth {
  typeDeviceProtocol(): Protocols;
  getConfigureBluetooth(): ConfigureBluetooth;
  getMinMaxPowerTransponder(): IPowerTransponder;
  getRSSIRange(): RSSIRange;
  sendCommand(command: ISendCommand): Promise<void>;
  converterMessageFromDevice(
    fromDevice: ConverterMessageFromDeviceProps
  ): IMessageFromDevice | undefined;
  setDevice(device: BluetoothDevice): void;
  getDevice(): BluetoothDevice | undefined;
  accumulateMessage(message: IMessageFromDevice): void;
  reportAccumulatedMessages(): IMessageFromDevice[];
}
