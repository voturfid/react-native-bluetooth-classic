import React, { type ReactNode } from 'react';
import { DeviceInteraction } from './deviceInteraction/index';

interface IProps {
  children: ReactNode;
}

function BluetoothVotuProvider({ children }: IProps): JSX.Element {
  return <DeviceInteraction>{children}</DeviceInteraction>;
}

export { BluetoothVotuProvider };
