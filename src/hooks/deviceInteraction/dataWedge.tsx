// // Zebra DataWedge for scanners barcode.
// import React, {
//   type ReactNode,
//   createContext,
//   useContext,
//   useEffect,
//   useRef,
// } from 'react';
// import { DeviceEventEmitter, type EmitterSubscription } from 'react-native';
// import DataWedgeIntents from 'react-native-datawedge-intents';
// import { assertOwnProperty } from '../../utils/assertOwnProperty';
// import { useControlTags } from './controlTags';

// interface DataWedgeProviderProps {
//   children: ReactNode;
// }

// interface DataWedgeData {
//   startScan: () => void;
//   stopScan: () => void;
// }

// type IntentProps = {
//   'RESULT_INFO': string;
//   'RESULT': string;
//   'COMMAND': string;
//   'com.symbol.datawedge.api.RESULT_GET_VERSION_INFO': string;
//   'com.symbol.datawedge.api.RESULT_ENUMERATE_SCANNERS': string;
//   'com.symbol.datawedge.api.RESULT_GET_ACTIVE_PROFILE': string;
// };

// type IntentVersionProps = {
//   'com.symbol.datawedge.api.RESULT_GET_VERSION_INFO': {
//     DATAWEDGE: string;
//   };
// };

// type IntentBarcodeScannerProps = {
//   'com.symbol.datawedge.decoded_mode': string | 'single_decode';
//   'com.symbol.datawedge.data_string': string;
//   'com.symbol.datawedge.data_dispatch_time': number;
//   'com.symbol.datawedge.label_type': string;
// };

// const DataWedgeContext = createContext<DataWedgeData>({} as DataWedgeData);

// function DataWedgeProvider({ children }: DataWedgeProviderProps) {
//   const { handleControlTags } = useControlTags();
//   const deviceSubscribeRef = useRef<EmitterSubscription | null>(null);

//   function startScan() {
//     sendCommand('com.symbol.datawedge.api.SOFT_SCAN_TRIGGER', 'START_SCANNING');
//   }

//   function stopScan() {
//     sendCommand('com.symbol.datawedge.api.SOFT_SCAN_TRIGGER', 'STOP_SCANNING');
//   }

//   function sendCommand(commandName: string, commandValue: unknown) {
//     const broadcastExtras: Record<string, unknown> = {};
//     broadcastExtras[commandName] = commandValue;
//     broadcastExtras.SEND_RESULT = 'true';

//     console.log(
//       'enviando commando: ',
//       commandName,
//       JSON.stringify(commandValue)
//     );

//     DataWedgeIntents.sendBroadcastWithExtras({
//       action: 'com.symbol.datawedge.api.ACTION',
//       extras: broadcastExtras,
//     });
//   }

//   function registerBroadcastReceiver() {
//     DataWedgeIntents.registerBroadcastReceiver({
//       filterActions: [
//         'com.zebra.reactnativedemo.ACTION',
//         'com.symbol.datawedge.api.RESULT_ACTION',
//       ],
//       filterCategories: ['android.intent.category.DEFAULT'],
//     });
//   }

//   function registerDeviceEventEmitterListenner() {
//     deviceSubscribeRef.current = DeviceEventEmitter.addListener(
//       'datawedge_broadcast_intent',
//       (intent: IntentProps) => {
//         broadcastReceiver(intent);
//       }
//     );
//   }

//   function broadcastReceiver(intent: IntentProps) {
//     //  Broadcast received
//     // console.log('Received Intent: ' + JSON.stringify(intent));

//     if (assertOwnProperty(intent, 'RESULT_INFO')) {
//       const commandResult =
//         intent.RESULT +
//         ' (' +
//         intent.COMMAND.substring(
//           intent.COMMAND.lastIndexOf('.') + 1,
//           intent.COMMAND.length
//         ) +
//         ')';
//       console.log('Command result', commandResult);
//     }

//     if (
//       assertOwnProperty(
//         intent,
//         'com.symbol.datawedge.api.RESULT_GET_VERSION_INFO'
//       )
//     ) {
//       //  The version has been returned (DW 6.3 or higher).  Includes the DW version along with other subsystem versions e.g MX
//       const versionInfo: IntentVersionProps =
//         intent as unknown as IntentVersionProps;

//       const datawedgeVersion =
//         versionInfo['com.symbol.datawedge.api.RESULT_GET_VERSION_INFO']
//           .DATAWEDGE;

//       console.log('Datawedge version: ' + datawedgeVersion);

//       //  Fire events sequentially so the application can gracefully degrade the functionality available on earlier DW versions
//       if (datawedgeVersion >= '06.3') datawedge63();
//       if (datawedgeVersion >= '06.4') datawedge64();
//       if (datawedgeVersion >= '06.5') datawedge65();
//     } else if (
//       assertOwnProperty(
//         intent,
//         'com.symbol.datawedge.api.RESULT_GET_ACTIVE_PROFILE'
//       )
//     ) {
//       //  Return from our request to obtain the active profile
//       const activeProfileObj =
//         intent['com.symbol.datawedge.api.RESULT_GET_ACTIVE_PROFILE'];
//       console.log('activeProfile', JSON.stringify(activeProfileObj));
//     } else if (!assertOwnProperty(intent, 'RESULT_INFO')) {
//       //  A barcode has been scanned
//       const scanned = intent as unknown as IntentBarcodeScannerProps;
//       handleControlTags({
//         data: { barcode: scanned['com.symbol.datawedge.data_string'] },
//         type: 'new',
//       });
//     }
//   }

//   function datawedge63(): void {
//     console.log('Datawedge 6.3 APIs are available');
//     //  Create a profile for our application
//     sendCommand('com.symbol.datawedge.api.CREATE_PROFILE', 'RFlog');

//     // state.dwVersionText =
//     //   '6.3.  Please configure profile manually.  See ReadMe for more details.';

//     //  Although we created the profile we can only configure it with DW 6.4.
//     sendCommand('com.symbol.datawedge.api.GET_ACTIVE_PROFILE', '');

//     //  Enumerate the available scanners on the device
//     sendCommand('com.symbol.datawedge.api.ENUMERATE_SCANNERS', '');
//   }

//   function datawedge64() {
//     console.log('Datawedge 6.4 APIs are available');

//     //  Configure the created profile (associated app and keyboard plugin)
//     const createProfile = {
//       PROFILE_NAME: 'RFlog',
//       PROFILE_ENABLED: 'true',
//       CONFIG_MODE: 'UPDATE',
//       PLUGIN_CONFIG: {
//         PLUGIN_NAME: 'BARCODE',
//         RESET_CONFIG: 'true',
//         PARAM_LIST: {},
//       },
//       APP_LIST: [
//         {
//           PACKAGE_NAME: 'com.rflogvarejomobile',
//           ACTIVITY_LIST: ['*'],
//         },
//       ],
//     };
//     sendCommand('com.symbol.datawedge.api.SET_CONFIG', createProfile);

//     //  Configure profile (intent plugin)
//     const configProfileIntent = {
//       PROFILE_NAME: 'RFlog',
//       PROFILE_ENABLED: 'true',
//       CONFIG_MODE: 'UPDATE',
//       PLUGIN_CONFIG: {
//         PLUGIN_NAME: 'INTENT',
//         RESET_CONFIG: 'true',
//         PARAM_LIST: {
//           intent_output_enabled: 'true',
//           intent_action: 'com.zebra.reactnativedemo.ACTION',
//           intent_delivery: '2',
//         },
//       },
//     };
//     sendCommand('com.symbol.datawedge.api.SET_CONFIG', configProfileIntent);

//     //  Configure profile (keystroke)
//     const configProfileKeyStroke = {
//       PROFILE_NAME: 'RFlog',
//       PROFILE_ENABLED: 'true',
//       CONFIG_MODE: 'UPDATE',
//       PLUGIN_CONFIG: {
//         PLUGIN_NAME: 'KEYSTROKE',
//         PARAM_LIST: {
//           keystroke_output_enabled: 'false',
//         },
//       },
//     };
//     sendCommand('com.symbol.datawedge.api.SET_CONFIG', configProfileKeyStroke);
//   }

//   function datawedge65(): void {
//     console.log('Datawedge 6.5 APIs are available');

//     //  Give some time for the profile to settle then query its value
//     setTimeout(() => {
//       sendCommand('com.symbol.datawedge.api.GET_ACTIVE_PROFILE', '');
//     }, 1000);
//   }

//   useEffect(() => {
//     registerDeviceEventEmitterListenner();
//     registerBroadcastReceiver();
//     sendCommand('com.symbol.datawedge.api.GET_VERSION_INFO', '');

//     return () => {
//       deviceSubscribeRef.current?.remove();
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   return (
//     <DataWedgeContext.Provider
//       value={{
//         startScan,
//         stopScan,
//       }}
//     >
//       {children}
//     </DataWedgeContext.Provider>
//   );
// }

// const useDataWedge = () => {
//   const context = useContext(DataWedgeContext);
//   return context;
// };

// export { DataWedgeProvider, useDataWedge };
