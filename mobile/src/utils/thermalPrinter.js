import { Alert, Platform, PermissionsAndroid } from 'react-native';

// Lazy load native modules - these only work in development builds, not Expo Go
let BluetoothManager = null;
let BluetoothEscposPrinter = null;
let nativeModulesAvailable = false;

try {
  const printer = require('react-native-bluetooth-escpos-printer');
  BluetoothManager = printer.BluetoothManager;
  BluetoothEscposPrinter = printer.BluetoothEscposPrinter;
  nativeModulesAvailable = BluetoothManager && BluetoothEscposPrinter;
} catch (err) {
  console.log('Thermal printer module not available (requires development build)');
  nativeModulesAvailable = false;
}

let connectedDevice = null;

// Check if thermal printing is available
export const isThermalPrintingAvailable = () => {
  return nativeModulesAvailable;
};

// Request Bluetooth permissions (Android)
export const requestBluetoothPermissions = async () => {
  if (!nativeModulesAvailable) return false;

  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
      return Object.values(granted).every(v => v === PermissionsAndroid.RESULTS.GRANTED);
    } catch (err) {
      console.error('Bluetooth permission error:', err);
      return false;
    }
  }
  return true;
};

// Check if Bluetooth is enabled
export const isBluetoothEnabled = async () => {
  if (!nativeModulesAvailable) return false;

  try {
    const enabled = await BluetoothManager.isBluetoothEnabled();
    return enabled;
  } catch (err) {
    console.error('Bluetooth check error:', err);
    return false;
  }
};

// Enable Bluetooth
export const enableBluetooth = async () => {
  if (!nativeModulesAvailable) return false;

  try {
    await BluetoothManager.enableBluetooth();
    return true;
  } catch (err) {
    console.error('Enable Bluetooth error:', err);
    return false;
  }
};

// Scan for Bluetooth devices
export const scanDevices = async () => {
  if (!nativeModulesAvailable) {
    Alert.alert(
      'Not Available',
      'Thermal printing requires a development build. Please rebuild the app with native modules.',
      [{ text: 'OK' }]
    );
    return [];
  }

  try {
    const hasPermission = await requestBluetoothPermissions();
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Bluetooth permissions are required to scan for printers.');
      return [];
    }

    const isEnabled = await isBluetoothEnabled();
    if (!isEnabled) {
      const enabled = await enableBluetooth();
      if (!enabled) {
        Alert.alert('Bluetooth Required', 'Please enable Bluetooth to connect to printer.');
        return [];
      }
    }

    const devices = await BluetoothManager.scanDevices();
    const parsed = typeof devices === 'string' ? JSON.parse(devices) : devices;

    // Filter for likely printers (you can customize this)
    const allDevices = [...(parsed.paired || []), ...(parsed.found || [])];
    return allDevices;
  } catch (err) {
    console.error('Scan devices error:', err);
    return [];
  }
};

// Connect to a printer
export const connectPrinter = async (address) => {
  if (!nativeModulesAvailable) return false;

  try {
    await BluetoothManager.connect(address);
    connectedDevice = address;
    return true;
  } catch (err) {
    console.error('Connect printer error:', err);
    return false;
  }
};

// Disconnect printer
export const disconnectPrinter = async () => {
  if (!nativeModulesAvailable) return true;

  try {
    if (connectedDevice) {
      await BluetoothManager.disconnect(connectedDevice);
      connectedDevice = null;
    }
    return true;
  } catch (err) {
    console.error('Disconnect error:', err);
    return false;
  }
};

// Check if printer is connected
export const isPrinterConnected = () => {
  return nativeModulesAvailable && connectedDevice !== null;
};

// Print Fee Receipt (Thermal format - 58mm)
export const printThermalFeeReceipt = async (data) => {
  if (!nativeModulesAvailable) {
    Alert.alert(
      'Not Available',
      'Thermal printing requires a development build. Use standard Print option instead.',
      [{ text: 'OK' }]
    );
    return false;
  }

  if (!connectedDevice) {
    Alert.alert('No Printer', 'Please connect to a thermal printer first.');
    return false;
  }

  try {
    const {
      receipt_number,
      student_name,
      father_name,
      mobile,
      trade,
      fee_type,
      amount,
      paid_amount,
      payment_method,
      payment_date,
      academic_year,
    } = data;

    const date = payment_date ? new Date(payment_date).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');

    await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);
    await BluetoothEscposPrinter.setBlob(0);
    await BluetoothEscposPrinter.printText('MANER PVT ITI\n', { fonttype: 1, widthtimes: 1, heigthtimes: 1 });
    await BluetoothEscposPrinter.printText('Fee Receipt\n', {});
    await BluetoothEscposPrinter.printText('--------------------------------\n', {});

    await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.LEFT);
    await BluetoothEscposPrinter.printText(`Receipt: ${receipt_number || 'N/A'}\n`, {});
    await BluetoothEscposPrinter.printText(`Date: ${date}\n`, {});
    await BluetoothEscposPrinter.printText('--------------------------------\n', {});
    await BluetoothEscposPrinter.printText(`Student: ${student_name}\n`, {});
    if (father_name) await BluetoothEscposPrinter.printText(`Father: ${father_name}\n`, {});
    if (mobile) await BluetoothEscposPrinter.printText(`Mobile: ${mobile}\n`, {});
    if (trade) await BluetoothEscposPrinter.printText(`Trade: ${trade}\n`, {});
    await BluetoothEscposPrinter.printText('--------------------------------\n', {});
    await BluetoothEscposPrinter.printText(`Fee Type: ${fee_type || 'Fee'}\n`, {});
    if (academic_year) await BluetoothEscposPrinter.printText(`Year: ${academic_year}\n`, {});
    await BluetoothEscposPrinter.printText(`Mode: ${payment_method || 'Cash'}\n`, {});
    await BluetoothEscposPrinter.printText('--------------------------------\n', {});

    await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);
    await BluetoothEscposPrinter.printText(`AMOUNT PAID\n`, { fonttype: 1 });
    await BluetoothEscposPrinter.printText(`Rs. ${paid_amount || amount || 0}\n`, { fonttype: 1, widthtimes: 2, heigthtimes: 2 });
    await BluetoothEscposPrinter.printText('--------------------------------\n', {});
    await BluetoothEscposPrinter.printText('Thank You!\n', {});
    await BluetoothEscposPrinter.printText('\n\n\n', {}); // Feed paper

    return true;
  } catch (err) {
    console.error('Print receipt error:', err);
    Alert.alert('Print Error', 'Failed to print receipt. Please check printer connection.');
    return false;
  }
};

// Print Library Fee Receipt (Thermal format - 58mm)
export const printThermalLibraryReceipt = async (data) => {
  if (!nativeModulesAvailable) {
    Alert.alert(
      'Not Available',
      'Thermal printing requires a development build. Use standard Print option instead.',
      [{ text: 'OK' }]
    );
    return false;
  }

  if (!connectedDevice) {
    Alert.alert('No Printer', 'Please connect to a thermal printer first.');
    return false;
  }

  try {
    const {
      receipt_number,
      student_name,
      mobile,
      seat_number,
      month,
      year,
      amount,
      payment_mode,
      created_at,
    } = data;

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = months[month - 1] || month;
    const date = created_at ? new Date(created_at).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');

    await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);
    await BluetoothEscposPrinter.setBlob(0);
    await BluetoothEscposPrinter.printText('MAA SARITA LIBRARY\n', { fonttype: 1, widthtimes: 1, heigthtimes: 1 });
    await BluetoothEscposPrinter.printText('Fee Receipt\n', {});
    await BluetoothEscposPrinter.printText('--------------------------------\n', {});

    await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.LEFT);
    await BluetoothEscposPrinter.printText(`Receipt: ${receipt_number || 'N/A'}\n`, {});
    await BluetoothEscposPrinter.printText(`Date: ${date}\n`, {});
    await BluetoothEscposPrinter.printText('--------------------------------\n', {});
    await BluetoothEscposPrinter.printText(`Student: ${student_name}\n`, {});
    if (mobile) await BluetoothEscposPrinter.printText(`Mobile: ${mobile}\n`, {});
    if (seat_number) await BluetoothEscposPrinter.printText(`Seat No: #${seat_number}\n`, {});
    await BluetoothEscposPrinter.printText('--------------------------------\n', {});
    await BluetoothEscposPrinter.printText(`Month: ${monthName} ${year}\n`, {});
    await BluetoothEscposPrinter.printText(`Mode: ${payment_mode || 'Cash'}\n`, {});
    await BluetoothEscposPrinter.printText('--------------------------------\n', {});

    await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);
    await BluetoothEscposPrinter.printText(`AMOUNT PAID\n`, { fonttype: 1 });
    await BluetoothEscposPrinter.printText(`Rs. ${amount || 0}\n`, { fonttype: 1, widthtimes: 2, heigthtimes: 2 });
    await BluetoothEscposPrinter.printText('--------------------------------\n', {});
    await BluetoothEscposPrinter.printText('Thank You!\n', {});
    await BluetoothEscposPrinter.printText('\n\n\n', {}); // Feed paper

    return true;
  } catch (err) {
    console.error('Print library receipt error:', err);
    Alert.alert('Print Error', 'Failed to print receipt. Please check printer connection.');
    return false;
  }
};

// Print Student Form (Thermal format - 58mm, compact)
export const printThermalStudentForm = async (student) => {
  if (!nativeModulesAvailable) {
    Alert.alert(
      'Not Available',
      'Thermal printing requires a development build. Use standard Print option instead.',
      [{ text: 'OK' }]
    );
    return false;
  }

  if (!connectedDevice) {
    Alert.alert('No Printer', 'Please connect to a thermal printer first.');
    return false;
  }

  try {
    const name = student.student_name || student.name || '';

    await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);
    await BluetoothEscposPrinter.setBlob(0);
    await BluetoothEscposPrinter.printText('MANER PVT ITI\n', { fonttype: 1, widthtimes: 1, heigthtimes: 1 });
    await BluetoothEscposPrinter.printText('Student Details\n', {});
    await BluetoothEscposPrinter.printText('================================\n', {});

    await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.LEFT);
    await BluetoothEscposPrinter.printText(`Name: ${name}\n`, { fonttype: 1 });
    await BluetoothEscposPrinter.printText(`Father: ${student.father_name || 'N/A'}\n`, {});
    await BluetoothEscposPrinter.printText(`Mother: ${student.mother_name || 'N/A'}\n`, {});
    await BluetoothEscposPrinter.printText(`Mobile: ${student.mobile || 'N/A'}\n`, {});
    await BluetoothEscposPrinter.printText(`Aadhaar: ${student.uidai_number || 'N/A'}\n`, {});
    await BluetoothEscposPrinter.printText('--------------------------------\n', {});
    await BluetoothEscposPrinter.printText(`Trade: ${student.trade || 'N/A'}\n`, {});
    await BluetoothEscposPrinter.printText(`Session: ${student.session || student.academic_year || 'N/A'}\n`, {});
    await BluetoothEscposPrinter.printText(`Enroll: ${student.enrollment_number || 'Not Assigned'}\n`, {});
    await BluetoothEscposPrinter.printText('--------------------------------\n', {});
    await BluetoothEscposPrinter.printText(`Address:\n`, {});
    await BluetoothEscposPrinter.printText(`${student.village_town_city || ''}\n`, {});
    await BluetoothEscposPrinter.printText(`${student.district || ''}, ${student.state || ''}\n`, {});
    await BluetoothEscposPrinter.printText(`PIN: ${student.pincode || ''}\n`, {});
    await BluetoothEscposPrinter.printText('================================\n', {});

    await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);
    await BluetoothEscposPrinter.printText(`${new Date().toLocaleDateString('en-IN')}\n`, {});
    await BluetoothEscposPrinter.printText('\n\n\n', {}); // Feed paper

    return true;
  } catch (err) {
    console.error('Print student form error:', err);
    Alert.alert('Print Error', 'Failed to print. Please check printer connection.');
    return false;
  }
};

export default {
  isThermalPrintingAvailable,
  requestBluetoothPermissions,
  isBluetoothEnabled,
  enableBluetooth,
  scanDevices,
  connectPrinter,
  disconnectPrinter,
  isPrinterConnected,
  printThermalFeeReceipt,
  printThermalLibraryReceipt,
  printThermalStudentForm,
};
