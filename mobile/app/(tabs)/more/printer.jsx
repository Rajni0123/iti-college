import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import * as Print from 'expo-print';
import { Colors } from '../../../src/constants/colors';
import {
  scanDevices,
  connectPrinter,
  disconnectPrinter,
  isPrinterConnected,
  printThermalFeeReceipt,
  isThermalPrintingAvailable,
} from '../../../src/utils/thermalPrinter';

const PRINTER_STORAGE_KEY = 'thermal_printer_address';
const PRINTER_TYPE_KEY = 'preferred_printer_type';

export default function PrinterSettingsScreen() {
  const [printerType, setPrinterType] = useState('standard'); // 'thermal' or 'standard'
  const [devices, setDevices] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState(null);
  const [connectedAddress, setConnectedAddress] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadSavedSettings();
  }, []);

  const loadSavedSettings = async () => {
    try {
      const savedType = await AsyncStorage.getItem(PRINTER_TYPE_KEY);
      if (savedType) setPrinterType(savedType);

      const savedAddress = await AsyncStorage.getItem(PRINTER_STORAGE_KEY);
      if (savedAddress) {
        setConnectedAddress(savedAddress);
        // Try to auto-connect for thermal
        if (savedType === 'thermal') {
          handleConnect({ address: savedAddress, name: 'Saved Printer' }, true);
        }
      }
    } catch (err) {
      console.error('Load saved settings error:', err);
    }
  };

  const handlePrinterTypeChange = async (type) => {
    setPrinterType(type);
    await AsyncStorage.setItem(PRINTER_TYPE_KEY, type);
  };

  // Test print for standard printers (Epson, Canon, HP etc.)
  const handleStandardTestPrint = async () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #1e40af; padding-bottom: 15px; margin-bottom: 20px; }
          .header h1 { color: #1e40af; font-size: 24px; margin: 0 0 5px 0; }
          .test-box { border: 2px dashed #16a34a; padding: 20px; text-align: center; margin: 20px 0; }
          .test-box h2 { color: #16a34a; margin: 0 0 10px 0; }
          .info { margin: 10px 0; }
          .footer { text-align: center; font-size: 12px; color: #666; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>MANER PVT ITI</h1>
          <p>Printer Test Page</p>
        </div>
        <div class="test-box">
          <h2>✓ Printer Working!</h2>
          <p>Your printer is connected and working correctly.</p>
        </div>
        <div class="info">
          <p><strong>Date:</strong> ${new Date().toLocaleString('en-IN')}</p>
          <p><strong>Printer Type:</strong> Standard (WiFi/Network)</p>
          <p><strong>Supported Models:</strong> Epson, Canon, HP, Brother, etc.</p>
        </div>
        <div class="footer">
          <p>Maner Pvt ITI - Mobile App Test Print</p>
        </div>
      </body>
      </html>
    `;

    try {
      await Print.printAsync({ html });
      Toast.show({ type: 'success', text1: 'Print dialog opened' });
    } catch (err) {
      console.error('Standard print error:', err);
      Toast.show({ type: 'error', text1: 'Print failed', text2: err.message });
    }
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      const foundDevices = await scanDevices();
      setDevices(foundDevices);
      if (foundDevices.length === 0) {
        Toast.show({ type: 'info', text1: 'No devices found', text2: 'Make sure printer is on and in pairing mode' });
      }
    } catch (err) {
      console.error('Scan error:', err);
      Toast.show({ type: 'error', text1: 'Scan failed', text2: err.message });
    } finally {
      setScanning(false);
      setRefreshing(false);
    }
  };

  const handleConnect = async (device, silent = false) => {
    setConnecting(device.address);
    try {
      const success = await connectPrinter(device.address);
      if (success) {
        setConnectedAddress(device.address);
        await AsyncStorage.setItem(PRINTER_STORAGE_KEY, device.address);
        if (!silent) {
          Toast.show({ type: 'success', text1: 'Connected', text2: `Connected to ${device.name || 'Printer'}` });
        }
      } else {
        if (!silent) {
          Toast.show({ type: 'error', text1: 'Connection failed', text2: 'Could not connect to printer' });
        }
      }
    } catch (err) {
      console.error('Connect error:', err);
      if (!silent) {
        Toast.show({ type: 'error', text1: 'Connection failed', text2: err.message });
      }
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectPrinter();
      setConnectedAddress(null);
      await AsyncStorage.removeItem(PRINTER_STORAGE_KEY);
      Toast.show({ type: 'success', text1: 'Disconnected' });
    } catch (err) {
      console.error('Disconnect error:', err);
      Toast.show({ type: 'error', text1: 'Disconnect failed' });
    }
  };

  const handleTestPrint = async () => {
    if (!connectedAddress) {
      Alert.alert('No Printer', 'Please connect to a printer first.');
      return;
    }

    try {
      const testData = {
        receipt_number: 'TEST-001',
        student_name: 'Test Student',
        father_name: 'Test Father',
        mobile: '9876543210',
        trade: 'Electrician',
        fee_type: 'Test Fee',
        amount: 1000,
        paid_amount: 1000,
        payment_method: 'Cash',
        payment_date: new Date().toISOString(),
        academic_year: '2026-2028',
      };

      const success = await printThermalFeeReceipt(testData);
      if (success) {
        Toast.show({ type: 'success', text1: 'Test print successful!' });
      }
    } catch (err) {
      console.error('Test print error:', err);
      Toast.show({ type: 'error', text1: 'Test print failed' });
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    handleScan();
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <MaterialCommunityIcons name="printer" size={48} color={Colors.primary} />
          <Text style={styles.headerTitle}>Printer Settings</Text>
          <Text style={styles.headerSubtitle}>Configure your printing preferences</Text>
        </View>

        {/* Printer Type Selection */}
        <View style={styles.typeSection}>
          <Text style={styles.sectionTitle}>Select Printer Type</Text>
          <View style={styles.typeCards}>
            <TouchableOpacity
              style={[styles.typeCard, printerType === 'standard' && styles.typeCardActive]}
              onPress={() => handlePrinterTypeChange('standard')}
            >
              <MaterialCommunityIcons
                name="printer"
                size={32}
                color={printerType === 'standard' ? Colors.primary : Colors.textSecondary}
              />
              <Text style={[styles.typeCardTitle, printerType === 'standard' && styles.typeCardTitleActive]}>
                Standard
              </Text>
              <Text style={styles.typeCardDesc}>Epson, Canon, HP</Text>
              <Text style={styles.typeCardDesc}>WiFi / Network</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.typeCard, printerType === 'thermal' && styles.typeCardActive]}
              onPress={() => handlePrinterTypeChange('thermal')}
            >
              <MaterialCommunityIcons
                name="printer-pos"
                size={32}
                color={printerType === 'thermal' ? Colors.primary : Colors.textSecondary}
              />
              <Text style={[styles.typeCardTitle, printerType === 'thermal' && styles.typeCardTitleActive]}>
                Thermal
              </Text>
              <Text style={styles.typeCardDesc}>Mini Printer</Text>
              <Text style={styles.typeCardDesc}>Bluetooth 58mm</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Standard Printer Section */}
        {printerType === 'standard' && (
          <View style={styles.standardSection}>
            <View style={styles.standardCard}>
              <MaterialCommunityIcons name="check-circle" size={48} color={Colors.success} />
              <Text style={styles.standardTitle}>Ready to Print</Text>
              <Text style={styles.standardDesc}>
                Standard printers (Epson L8050, Canon, HP, Brother) work automatically via WiFi/Network.
                Just make sure your printer is on the same network as your phone.
              </Text>
              <TouchableOpacity style={styles.standardTestBtn} onPress={handleStandardTestPrint}>
                <MaterialCommunityIcons name="printer-check" size={20} color="#fff" />
                <Text style={styles.standardTestBtnText}>Print Test Page</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.supportedModels}>
              <Text style={styles.supportedTitle}>Supported Printers:</Text>
              <View style={styles.modelsList}>
                <View style={styles.modelItem}>
                  <Text style={styles.modelBrand}>Epson</Text>
                  <Text style={styles.modelNames}>L8050, L3250, L3210, EcoTank series</Text>
                </View>
                <View style={styles.modelItem}>
                  <Text style={styles.modelBrand}>Canon</Text>
                  <Text style={styles.modelNames}>PIXMA G series, MegaTank series</Text>
                </View>
                <View style={styles.modelItem}>
                  <Text style={styles.modelBrand}>HP</Text>
                  <Text style={styles.modelNames}>DeskJet, LaserJet, Smart Tank series</Text>
                </View>
                <View style={styles.modelItem}>
                  <Text style={styles.modelBrand}>Brother</Text>
                  <Text style={styles.modelNames}>Inkjet & Laser series</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Thermal Printer Section */}
        {printerType === 'thermal' && (
          <>
            {/* Native Module Not Available Warning */}
            {!isThermalPrintingAvailable() && (
              <View style={styles.warningCard}>
                <MaterialCommunityIcons name="alert-circle" size={32} color="#f59e0b" />
                <Text style={styles.warningTitle}>Development Build Required</Text>
                <Text style={styles.warningText}>
                  Thermal printing requires a development build with native modules.
                  In Expo Go, only standard printing (WiFi/Network) is available.
                </Text>
                <Text style={styles.warningCommand}>
                  Run: npx expo prebuild && npx expo run:android
                </Text>
              </View>
            )}

            {/* Connection Status - Only when available */}
            {isThermalPrintingAvailable() && (
              <>
                <View style={styles.statusCard}>
                  <View style={styles.statusRow}>
                    <View style={[styles.statusDot, connectedAddress ? styles.statusConnected : styles.statusDisconnected]} />
                    <Text style={styles.statusText}>
                      {connectedAddress ? 'Connected' : 'Not Connected'}
                    </Text>
                  </View>
                  {connectedAddress && (
                    <View style={styles.statusActions}>
                      <TouchableOpacity style={styles.testBtn} onPress={handleTestPrint}>
                        <MaterialCommunityIcons name="printer-check" size={18} color="#fff" />
                        <Text style={styles.testBtnText}>Test Print</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.disconnectBtn} onPress={handleDisconnect}>
                        <MaterialCommunityIcons name="bluetooth-off" size={18} color="#ef4444" />
                        <Text style={styles.disconnectBtnText}>Disconnect</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Scan Button */}
                <TouchableOpacity
                  style={[styles.scanBtn, scanning && styles.scanBtnDisabled]}
                  onPress={handleScan}
                  disabled={scanning}
                >
                  {scanning ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <MaterialCommunityIcons name="bluetooth-search" size={22} color="#fff" />
                  )}
                  <Text style={styles.scanBtnText}>
                    {scanning ? 'Scanning...' : 'Scan for Printers'}
                  </Text>
                </TouchableOpacity>

                {/* Devices List */}
                {devices.length > 0 && (
                  <View style={styles.devicesSection}>
                    <Text style={styles.sectionTitle}>Available Devices ({devices.length})</Text>
                    {devices.map((device, index) => (
                      <TouchableOpacity
                        key={device.address || index}
                        style={[
                          styles.deviceCard,
                          connectedAddress === device.address && styles.deviceCardConnected,
                        ]}
                        onPress={() => handleConnect(device)}
                        disabled={connecting === device.address}
                      >
                        <View style={styles.deviceInfo}>
                          <MaterialCommunityIcons
                            name={connectedAddress === device.address ? 'printer-check' : 'printer'}
                            size={24}
                            color={connectedAddress === device.address ? Colors.success : Colors.textSecondary}
                          />
                          <View style={styles.deviceText}>
                            <Text style={styles.deviceName}>{device.name || 'Unknown Device'}</Text>
                            <Text style={styles.deviceAddress}>{device.address}</Text>
                          </View>
                        </View>
                        {connecting === device.address ? (
                          <ActivityIndicator color={Colors.primary} size="small" />
                        ) : connectedAddress === device.address ? (
                          <MaterialCommunityIcons name="check-circle" size={24} color={Colors.success} />
                        ) : (
                          <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.textLight} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Instructions */}
                <View style={styles.instructions}>
                  <Text style={styles.instructionsTitle}>How to connect:</Text>
                  <Text style={styles.instructionText}>1. Turn on your thermal printer</Text>
                  <Text style={styles.instructionText}>2. Enable Bluetooth on your phone</Text>
                  <Text style={styles.instructionText}>3. Tap "Scan for Printers" above</Text>
                  <Text style={styles.instructionText}>4. Select your printer from the list</Text>
                  <Text style={styles.instructionText}>5. Use "Test Print" to verify connection</Text>
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 12,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  // Printer Type Selection
  typeSection: {
    marginBottom: 20,
  },
  typeCards: {
    flexDirection: 'row',
    gap: 12,
  },
  typeCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  typeCardActive: {
    borderColor: Colors.primary,
    backgroundColor: '#f0f7ff',
  },
  typeCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginTop: 8,
  },
  typeCardTitleActive: {
    color: Colors.primary,
  },
  typeCardDesc: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 2,
  },
  // Standard Printer Section
  standardSection: {
    marginBottom: 20,
  },
  standardCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  standardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 12,
  },
  standardDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  standardTestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 16,
  },
  standardTestBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  supportedModels: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
  },
  supportedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  modelsList: {},
  modelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modelBrand: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
    width: 70,
  },
  modelNames: {
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
  },
  // Warning Card for development build
  warningCard: {
    backgroundColor: '#fef3c7',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400e',
    marginTop: 12,
  },
  warningText: {
    fontSize: 13,
    color: '#78350f',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  warningCommand: {
    fontSize: 11,
    color: '#92400e',
    backgroundColor: '#fde68a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 12,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusConnected: {
    backgroundColor: '#22c55e',
  },
  statusDisconnected: {
    backgroundColor: '#94a3b8',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  statusActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  testBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.success,
    borderRadius: 10,
    paddingVertical: 10,
  },
  testBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  disconnectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  disconnectBtnText: {
    color: '#ef4444',
    fontWeight: '600',
    fontSize: 14,
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 20,
  },
  scanBtnDisabled: {
    opacity: 0.7,
  },
  scanBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  devicesSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  deviceCardConnected: {
    borderColor: Colors.success,
    backgroundColor: '#f0fdf4',
  },
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deviceText: {},
  deviceName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  deviceAddress: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  instructions: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 16,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 10,
  },
  instructionText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 6,
    paddingLeft: 4,
  },
});
