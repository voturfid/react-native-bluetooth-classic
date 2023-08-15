import Reader1128 from '../assets/readers/1128.png';
import Reader1153 from '../assets/readers/1153.png';
import ReaderIh21 from '../assets/readers/ih21.png';
import ReaderIh25 from '../assets/readers/ih25.png';
import Reader8500 from '../assets/readers/8500.png';
import ReaderIp30 from '../assets/readers/ip30.png';
import ReaderGeneric from '../assets/readers/generic.png';
import { existDevice } from '../bluetooth/index';
import React from 'react';

export function getDeviceImage(name: string) {
  const device = existDevice(name);

  switch (device) {
    case '1128':
      return Reader1128;
    case '1153':
      return Reader1153;
    case 'ih21':
      return ReaderIh21;
    case 'ih25':
      return ReaderIh25;
    case '8500':
      return React.createElement('img', { src: Reader8500, alt: '8500' });
    case 'ip30':
      return ReaderIp30;
    default:
      return ReaderGeneric;
  }
}
