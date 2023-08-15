import React, { ReactNode } from 'react';
import { BluetoothClassicProvider } from './bluetoothClassic';
import { ControlTagsProvider } from './controlTags';
import { ReportAccumulatedTagsProvider } from './reportAccumulatedTags';
import { ReportCurrentReadBarcodeProvider } from './reportCurrentBarcode';
import { ReportCurrentReadTagsProvider } from './reportCurrentReadTags';
import { ReportCurrentWriteTagsProvider } from './reportCurrentWriteTag';
import { ReportReadForRecorderTagsProvider } from './reportReadForRecorderTag';
// import { DataWedgeProvider } from './dataWedge';

interface IProps {
  children: ReactNode;
}

function DeviceInteraction({ children }: IProps): JSX.Element {
  return (
    <ReportAccumulatedTagsProvider>
      <ReportCurrentReadTagsProvider>
        <ReportReadForRecorderTagsProvider>
          <ReportCurrentWriteTagsProvider>
            <ReportCurrentReadBarcodeProvider>
              <ControlTagsProvider>
                {/* <DataWedgeProvider> */}
                <BluetoothClassicProvider>{children}</BluetoothClassicProvider>
                {/* </DataWedgeProvider> */}
              </ControlTagsProvider>
            </ReportCurrentReadBarcodeProvider>
          </ReportCurrentWriteTagsProvider>
        </ReportReadForRecorderTagsProvider>
      </ReportCurrentReadTagsProvider>
    </ReportAccumulatedTagsProvider>
  );
}

export { DeviceInteraction };
