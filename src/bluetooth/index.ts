import { TSL } from './protocols/implementations/tsl';
import { ZETI } from './protocols/implementations/zeti';
import { BRI } from './protocols/implementations/bri';

interface IEpcProps {
  epc: string;
  rssi: string;
}

interface IMessageFromDevice {
  command:
  | 'inventory'
  | 'battery'
  | 'temperature'
  | 'sound'
  | 'write'
  | 'barcode'
  | 'read'
  | 'trigger';
  battery?: {
    level: number;
    isCharging: boolean;
  };
  temperature?: number;
  triggerIsPressed?: boolean;
  barcode?: string;
  tags?: IEpcProps[];
  write?: {
    epcRead: string | undefined;
    epcWrite: string | undefined;
  };
  error?: string;
}

export type QuerySessionProps = 's0' | 's1' | 's2' | 's3';
export type QueryTargetProps = 'a' | 'b';

interface ISendCommand {
  type:
  | 'configure'
  | 'inventory'
  | 'battery'
  | 'sound'
  | 'autoplay'
  | 'abort'
  | 'readForWrite'
  | 'write'
  | 'getTagsInBatch'
  | 'disconnect';
  data?: {
    sound?: boolean;
    power?: number;
    writeEpc?: string;
    readerConfig?: {
      querySession: QuerySessionProps;
      queryTarget: QueryTargetProps;
    };
  };
}
type BluetoothProtocols = TSL | ZETI | BRI;
type BluetoothProtocolMapProps = {
  [protocol: string]: typeof TSL | typeof ZETI | typeof BRI;
};

const bluetoothProtocolMap: BluetoothProtocolMapProps = {
  1128: TSL,
  1153: TSL,
  ih21: TSL,
  ih25: TSL,
  8500: ZETI,
  ip30: BRI,
};

function existDevice(name: string): string {
  const deviceFounded = Object.keys(bluetoothProtocolMap).find((device) =>
    name?.toLowerCase().includes(device)
  );
  if (deviceFounded) {
    return deviceFounded;
  }

  return '';
}

function getDeviceProtocol(name: string): BluetoothProtocols | undefined {
  const deviceFounded = existDevice(name);

  if (deviceFounded !== '') {
    const Protocol = bluetoothProtocolMap[deviceFounded];

    if (Protocol) return new Protocol();
  }

  return undefined;
}

export { bluetoothProtocolMap, getDeviceProtocol, existDevice };

export type { BluetoothProtocols, IMessageFromDevice, ISendCommand, IEpcProps };
