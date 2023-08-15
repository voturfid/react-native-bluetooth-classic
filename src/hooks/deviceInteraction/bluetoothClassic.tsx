/* eslint-disable react-hooks/exhaustive-deps */
import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  createContext,
  useContext,
  type ReactNode,
  type MutableRefObject,
} from 'react';
import { Alert, PermissionsAndroid, type Permission } from 'react-native';
import RNBluetoothClassic, {
  BluetoothDevice,
  BluetoothDeviceEvent,
} from '../../bluetooth/device/index';
import {
  StateChangeEvent,
  BluetoothDeviceReadEvent,
  BluetoothEventSubscription,
} from '../../bluetooth/device/BluetoothEvent';
import {
  bluetoothProtocolMap,
  BluetoothProtocols,
  getDeviceProtocol,
  IMessageFromDevice,
  ISendCommand,
} from '../../bluetooth/index';
import { useControlTags } from './controlTags';
// import { HEADER_TAG } from '@env';
// import { useDataWedge } from './dataWedge';

interface BluetoothClassicProviderProps {
  children: ReactNode;
}

type SendCommandProps = Omit<ISendCommand, 'connectedDevice'>;

type DataOperationProps = {
  [key in IMessageFromDevice['command']]: (
    received: IMessageFromDevice
  ) => Promise<void>;
};

export interface BluetoothClassicData {
  isBluetoothAvailable: boolean;
  isBluetoothEnabled: boolean;
  bondedDevices: BluetoothDevice[];
  connectToDevice: (device: BluetoothDevice) => Promise<void>;
  disconnectFromDevice: () => Promise<void>;
  deviceRawProps: MutableRefObject<BluetoothProtocols | undefined>;
  isConnected: boolean;
  batteryLevel: number;
  batteryIsCharging: boolean;
  audio: boolean;
  powerTransponder: number;
  handleChangePowerTransponder: (value: number) => void;
  handleTurnOnOffAudio: () => void;
  handleCleanDevice: () => Promise<void>;
  loadingConnectDisconnect: boolean;
  sendCommandToDevice: (command: SendCommandProps) => Promise<void>;
}

const BluetoothClassicContext = createContext<BluetoothClassicData>(
  {} as BluetoothClassicData
);

const requestBluetoothPermission = async () => {
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT as Permission,
      {
        title: 'Permissão para acessar o Bluetooth',
        message:
          'Algumas funcionalidades do aplicativo necessitam de acesso ao Bluetooth, por favor, conceda a permissão.',
        buttonNegative: 'Não',
        buttonPositive: 'Sim',
      }
    );
    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
      console.log('You can use the bluetooth');
    } else {
      console.log('bluetooth permission denied');
    }
  } catch (err) {
    console.warn(err);
  }
};

function BluetoothClassicProvider({ children }: BluetoothClassicProviderProps) {
  const { handleControlTags, handleControlClear, readModeReport } =
    useControlTags();

  // const { startScan, stopScan } = useDataWedge();

  const [isBluetoothAvailable, setIsBluetoothAvailable] = useState(false);
  const [isBluetoothEnabled, setIsBluetoothEnabled] = useState(false);
  const [bondedDevices, setBondedDevices] = useState<BluetoothDevice[]>([]);
  const [onReceivedListenner, setOnReceivedListenner] = useState<
    BluetoothEventSubscription | undefined
  >(undefined);

  const [isConnected, setIsConnected] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState(0);
  const [batteryIsCharging, setBatteryIsCharging] = useState(false);
  const [audio, setAudio] = useState(true);
  const [loading, setLoading] = useState(false);
  const [powerTransponder, setPowerTransponder] = useState(0);

  const deviceRawProps = useRef<BluetoothProtocols | undefined>(undefined);

  async function bluetoothIsAvailable() {
    try {
      const isAvailable = await RNBluetoothClassic.isBluetoothAvailable();
      setIsBluetoothAvailable(isAvailable);
      if (!isAvailable) {
        Alert.alert('Bluetooth não suportado por dispositivo');
      }
    } catch (error) {
      console.log(error);
    }
  }

  async function bluetoothIsEnabled() {
    try {
      const isEnabled = await RNBluetoothClassic.isBluetoothEnabled();
      setIsBluetoothEnabled(isEnabled);
      if (!isEnabled) {
        Alert.alert('Bluetooth não está habilitado');
      }
    } catch (error) {
      console.log(error);
    }
  }

  async function getBondedDevices() {
    const devices = Object.keys(bluetoothProtocolMap);
    const devicesPaired = await RNBluetoothClassic.getBondedDevices();
    const devicesCompatible = devicesPaired.filter((devicePaired) =>
      devices.some((device) => devicePaired.name.toLowerCase().includes(device))
    );
    setBondedDevices(devicesCompatible);
  }

  const connectToDevice = useCallback(
    async (device: BluetoothDevice): Promise<void> => {
      try {
        setLoading(true);
        deviceRawProps.current = getDeviceProtocol(device.name);

        if (deviceRawProps.current) {
          const connectedDevice = await RNBluetoothClassic.connectToDevice(
            device.address,
            deviceRawProps.current.getConfigureBluetooth()
          );

          deviceRawProps.current.setDevice(connectedDevice);

          if (connectedDevice) {
            console.log(`Connected to device...${connectedDevice.address}`);
            setAudio(true);
            setIsConnected(true);
            setOnReceivedListenner(
              connectedDevice.onDataReceived(onDataReceived)
            );

            await deviceRawProps.current?.sendCommand({
              type: 'configure',
            });

            await deviceRawProps.current?.sendCommand({
              type: 'battery',
            });

            await deviceRawProps.current?.sendCommand({
              type: 'sound',
              data: { sound: true },
            });

            setPowerTransponder(
              deviceRawProps.current.getMinMaxPowerTransponder().max || 0
            );
          }
        }
      } catch (error) {
        deviceRawProps.current = undefined;
        console.log(error);
        Alert.alert(
          'Erro ao conectar',
          'Certifique-se que o aparelho está ligado',
          [
            {
              text: 'OK',
              style: 'cancel',
            },
          ]
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  async function disconnectFromDevice(): Promise<void> {
    if (deviceRawProps.current) {
      setLoading(true);
      const address = deviceRawProps.current.getDevice()?.address;

      await sendCommandToDevice({ type: 'disconnect' });
      if (onReceivedListenner) {
        onReceivedListenner.remove();
        setOnReceivedListenner(undefined);
      }

      await RNBluetoothClassic.disconnectFromDevice(address || '');
      console.log(`Disconnected to device...${address}`);

      deviceRawProps.current = undefined;
      setIsConnected(false);
      setBatteryLevel(0);
      setBatteryIsCharging(false);
      setAudio(false);
      setLoading(false);
      setPowerTransponder(0);
    }
  }

  function onDeviceConnected(event: BluetoothDeviceEvent) {
    console.log(`Device connected...${event.device}`);
  }
  function onDeviceDisconnected(event: BluetoothDeviceEvent) {
    console.log(`Device disconnected...${event.device}`);
  }
  function onStateChanged(event: StateChangeEvent) {
    console.log(`State changed...${event.enabled}`);
  }
  function onErrorBluetooth(event: BluetoothDeviceEvent) {
    console.log(`Error bluetooth...${event.eventType}: ${event.device}`);
  }

  const onDataReceived = useCallback((event: BluetoothDeviceReadEvent) => {
    if (__DEV__) {
      console.log(`Data received...: ${event.data}`);
    }

    const received = deviceRawProps.current?.converterMessageFromDevice({
      message: event.data,
      readModeReport: readModeReport.current,
    });

    if (received) {
      deviceRawProps.current?.accumulateMessage(received);
    }
  }, []);

  const sendCommandToDevice = useCallback(
    async (command: SendCommandProps): Promise<void> => {
      try {
        await deviceRawProps.current?.sendCommand({
          ...command,
        });
      } catch (error) {
        console.log(error);
      }
    },
    []
  );

  const reportMessagesFromDeviceToScreens = useCallback(async () => {
    const dataOperation: DataOperationProps = {
      battery: async (received: IMessageFromDevice) => {
        setBatteryLevel(received.battery?.level || 0);
        setBatteryIsCharging(received.battery?.isCharging || false);
      },
      // eslint-disable-next-line prettier/prettier
      temperature: async () => { },
      inventory: async (received: IMessageFromDevice) => {
        // console.log('rawTags', received.tags);
        const tagsReported = received.tags;
        if (tagsReported) {
          // const tagsReportFiltered = tagsReported.filter((tag) =>
          //   tag.epc?.startsWith(HEADER_TAG)
          // );

          // if (tagsReportFiltered.length > 0) {
          //   handleControlTags({
          //     data: { epcs: tagsReportFiltered },
          //     type: 'new',
          //   });
          // }
          handleControlTags({
            data: { epcs: tagsReported },
            type: 'new',
          });
        }
      },
      read: async (received: IMessageFromDevice) => {
        if (received) {
          const tagsReported = received.tags;

          if (tagsReported) {
            // const tagsReportFiltered = tagsReported.filter((tag) =>
            //   tag.epc?.startsWith(HEADER_TAG)
            // );

            // handleControlTags({
            //   data: {
            //     epcs: tagsReportFiltered || [],
            //     error: received?.error,
            //   },
            //   type: 'new',
            // });
            handleControlTags({
              data: {
                epcs: tagsReported || [],
                error: received?.error,
              },
              type: 'new',
            });
          }
        }
      },
      write: async (received: IMessageFromDevice) => {
        // console.log(received);
        if (received.write) {
          const written = received.write;
          if ((written.epcRead && written.epcWrite) || received?.error) {
            handleControlTags({
              data: {
                epcRead: written.epcRead || '',
                epcWritten: written.epcWrite || '',
                error: received?.error,
              },
              type: 'new',
            });
          }
        }
      },
      barcode: async (received: IMessageFromDevice) => {
        // console.log('rawDevice', received?.barcode);
        if (!received.error) {
          handleControlTags({
            data: { barcode: received.barcode },
            type: 'new',
          });
        }
      },
      // eslint-disable-next-line prettier/prettier
      sound: async () => { },
      trigger: async (received: IMessageFromDevice) => {
        console.log('mode', readModeReport.current);
        if (received.triggerIsPressed) {
          if (readModeReport.current === 'barcode') {
            // startScan();
          } else {
            if (
              readModeReport.current !== 'readForRecorder' &&
              readModeReport.current !== 'write'
            ) {
              await sendCommandToDevice({
                type: 'inventory',
                data: { power: powerTransponder },
              });
            }
          }
        } else {
          if (readModeReport.current === 'barcode') {
            // stopScan();
          } else {
            if (
              readModeReport.current !== 'readForRecorder' &&
              readModeReport.current !== 'write'
            ) {
              await sendCommandToDevice({ type: 'abort' });
            }
          }
        }
      },
    };

    const reported = deviceRawProps.current?.reportAccumulatedMessages();
    if (reported) {
      for (const report of reported) {
        await dataOperation[report.command](report);
      }
    }
  }, [powerTransponder]);

  function handleTurnOnOffAudio() {
    setAudio(!audio);
  }

  function handleChangePowerTransponder(value: number) {
    setPowerTransponder(value);
  }

  async function handleCleanDevice() {
    await handleControlClear();
  }

  useEffect(() => {
    async function initBluetooth() {
      await requestBluetoothPermission();
      bluetoothIsAvailable();
      bluetoothIsEnabled();
      getBondedDevices();
    }
    initBluetooth();
    const listennerConnected =
      RNBluetoothClassic.onDeviceConnected(onDeviceConnected);
    const listennerDisconnected =
      RNBluetoothClassic.onDeviceDisconnected(onDeviceDisconnected);
    const listennerStateChanged =
      RNBluetoothClassic.onStateChanged(onStateChanged);
    const listennerError = RNBluetoothClassic.onError(onErrorBluetooth);

    return () => {
      listennerConnected.remove();
      listennerDisconnected.remove();
      listennerStateChanged.remove();
      listennerError.remove();
      if (onReceivedListenner) {
        onReceivedListenner.remove();
      }
    };
  }, []);

  useEffect(() => {
    const batteryAsk = setInterval(async () => {
      if (isConnected) {
        await deviceRawProps.current?.sendCommand({
          type: 'battery',
        });
      }
    }, 1000 * 15); // 15s

    const reportMessageTask = setInterval(async () => {
      if (isConnected) {
        await reportMessagesFromDeviceToScreens();
      }
    }, 700); // 700ms

    return () => {
      clearInterval(batteryAsk);
      clearInterval(reportMessageTask);
    };
  }, [isConnected, powerTransponder]);

  useEffect(() => {
    async function changeAudioDevice() {
      if (isConnected) {
        await deviceRawProps.current?.sendCommand({
          type: 'sound',
          data: { sound: audio },
        });
      }
    }

    changeAudioDevice();
  }, [audio, isConnected]);

  return (
    <BluetoothClassicContext.Provider
      value={{
        isBluetoothAvailable,
        isBluetoothEnabled,
        bondedDevices,
        connectToDevice,
        disconnectFromDevice,
        deviceRawProps,
        isConnected,
        batteryLevel,
        batteryIsCharging,
        audio,
        powerTransponder,
        handleTurnOnOffAudio,
        handleChangePowerTransponder,
        handleCleanDevice,
        loadingConnectDisconnect: loading,
        sendCommandToDevice,
      }}
    >
      {children}
    </BluetoothClassicContext.Provider>
  );
}

function useBluetoothClassic() {
  const context = useContext(BluetoothClassicContext);
  return context;
}

export { BluetoothClassicProvider, useBluetoothClassic };
