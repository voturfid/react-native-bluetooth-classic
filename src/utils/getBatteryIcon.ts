import theme from '../styles/theme';

export interface IBatteryStatus {
  nameIcon: string;
  color: string;
}

export function getBatteryIcon(
  batteryLevel: number,
  isCharging: boolean = false
): IBatteryStatus {
  if (isCharging) {
    return {
      nameIcon: 'battery-charging',
      color: theme.colors.success,
    };
  }
  if (batteryLevel > 0 && batteryLevel <= 4) {
    return {
      nameIcon: 'battery-alert-bluetooth',
      color: theme.colors.danger,
    };
  } else if (batteryLevel > 5 && batteryLevel <= 10) {
    return {
      nameIcon: 'battery-10-bluetooth',
      color: theme.colors.danger,
    };
  } else if (batteryLevel > 10 && batteryLevel <= 20) {
    return {
      nameIcon: 'battery-20-bluetooth',
      color: theme.colors.alert,
    };
  } else if (batteryLevel > 20 && batteryLevel <= 30) {
    return {
      nameIcon: 'battery-30-bluetooth',
      color: theme.colors.alert,
    };
  } else if (batteryLevel > 30 && batteryLevel <= 40) {
    return {
      nameIcon: 'battery-40-bluetooth',
      color: theme.colors.alert,
    };
  } else if (batteryLevel > 40 && batteryLevel <= 50) {
    return {
      nameIcon: 'battery-50-bluetooth',
      color: theme.colors.success,
    };
  } else if (batteryLevel > 50 && batteryLevel <= 60) {
    return {
      nameIcon: 'battery-60-bluetooth',
      color: theme.colors.success,
    };
  } else if (batteryLevel > 60 && batteryLevel <= 70) {
    return {
      nameIcon: 'battery-70-bluetooth',
      color: theme.colors.success,
    };
  } else if (batteryLevel > 70 && batteryLevel <= 80) {
    return {
      nameIcon: 'battery-80-bluetooth',
      color: theme.colors.success,
    };
  } else if (batteryLevel > 80 && batteryLevel <= 90) {
    return {
      nameIcon: 'battery-90-bluetooth',
      color: theme.colors.success,
    };
  } else if (batteryLevel > 90 && batteryLevel <= 100) {
    return {
      nameIcon: 'battery-bluetooth',
      color: theme.colors.success,
    };
  } else {
    return {
      nameIcon: 'battery-unknown-bluetooth',
      color: theme.colors.title,
    };
  }
}
