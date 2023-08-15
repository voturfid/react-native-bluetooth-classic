// Bluetooth Classic
import RNBluetoothClassic, {
  BluetoothDevice,
  BluetoothDeviceEvent,
  BluetoothError,
  BluetoothDeviceReadEvent,
  BluetoothEvent,
  BluetoothEventListener,
  BluetoothEventSubscription,
  BluetoothEventType,
  BluetoothNativeDevice,
  StandardOptions,
  BluetoothNativeModule
} from './bluetooth/device/index';

// Implementations
import { BluetoothVotuProvider } from './hooks/index';
import { useBluetoothClassic } from './hooks/deviceInteraction/bluetoothClassic';
import { useControlTags } from './hooks/deviceInteraction/controlTags';
import { getBatteryIcon } from './utils/getBatteryIcon';
import { getDeviceImage } from './utils/getDeviceImage';
import { IEpcProps } from './bluetooth/index';

// Exports Bluetooth Classic
export default RNBluetoothClassic;

export {
  BluetoothDevice,
  BluetoothError,
  BluetoothEvent,
  BluetoothDeviceEvent,
  BluetoothDeviceReadEvent,
  BluetoothEventListener,
  BluetoothEventSubscription,
  BluetoothEventType,
  BluetoothNativeDevice,
  BluetoothNativeModule,
  StandardOptions,
};

// Exports Implementations
export {
  BluetoothVotuProvider,
  useBluetoothClassic,
  useControlTags,
  getBatteryIcon,
  getDeviceImage,
  IEpcProps
};