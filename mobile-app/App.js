import React, { useState, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, Image, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Camera as CameraIcon, Wallet, PieChart, X } from 'lucide-react-native';

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [photo, setPhoto] = useState(null);
  const cameraRef = useRef(null);

  const [balance, setBalance] = useState(45200);

  if (!permission) {
    return <View />; // Camera permissions are still loading
  }

  if (!permission.granted && isScanning) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center', color: 'white' }}>We need your permission to show the camera</Text>
        <TouchableOpacity style={styles.btnPrimary} onPress={requestPermission}>
          <Text style={styles.btnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current) {
      const options = { quality: 0.5, base64: true };
      const data = await cameraRef.current.takePictureAsync(options);
      setPhoto(data.uri);

      // Send to typical SmartSpend backend...
      Alert.alert(
        "Scanning Receipt...",
        "Uploading to SmartSpend AI Engine",
        [
          {
            text: "OK", onPress: () => {
              setIsScanning(false);
              setPhoto(null);
              setBalance(prev => prev + 1500); // Simulate an expense addition
              Alert.alert("Success", "Added ₹1,500 from receipt");
            }
          }
        ]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {isScanning ? (
        <View style={styles.cameraContainer}>
          <CameraView style={styles.camera} ref={cameraRef}>
            <View style={styles.cameraControlsBtnContainer}>
              <TouchableOpacity style={styles.closeCameraBtn} onPress={() => setIsScanning(false)}>
                <X color="white" size={32} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.captureBtn} onPress={takePicture}>
                <View style={styles.innerCaptureBtn} />
              </TouchableOpacity>
            </View>
          </CameraView>
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Wallet color="#3b82f6" size={28} style={{ marginRight: 10 }} />
              <Text style={styles.headerTitle}>SmartSpend</Text>
            </View>
            <Text style={styles.headerSubtitle}>Ready for UPI Parsing & Receipts</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.balanceTitle}>Total Balance</Text>
            <Text style={styles.balanceAmount}>₹{balance.toLocaleString('en-IN')}</Text>
            <View style={styles.trendContainer}>
              <Text style={styles.trendPositive}>+12% from last month</Text>
            </View>
          </View>

          <View style={styles.actionGrid}>
            <TouchableOpacity style={styles.gridBtnPrimary} onPress={() => setIsScanning(true)}>
              <CameraIcon color="white" size={24} style={{ marginBottom: 8 }} />
              <Text style={styles.btnPrimaryText}>Scan Receipt</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.gridBtnSecondary}>
              <PieChart color="#94a3b8" size={24} style={{ marginBottom: 8 }} />
              <Text style={styles.btnSecondaryText}>Analytics</Text>
            </TouchableOpacity>
          </View>

          <StatusBar style="light" />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a', /* --bg-dark */
    paddingTop: 50,
    alignItems: 'center'
  },
  header: {
    width: '100%',
    paddingHorizontal: 24,
    marginBottom: 40,
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 32,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#94a3b8',
    fontSize: 16,
    marginTop: 8,
  },
  card: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderRadius: 24,
    width: '90%',
    padding: 28,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  balanceTitle: {
    color: '#94a3b8',
    fontSize: 16,
    marginBottom: 10,
  },
  balanceAmount: {
    color: '#f8fafc',
    fontSize: 44,
    fontWeight: 'bold',
  },
  trendContainer: {
    marginTop: 15,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  trendPositive: {
    color: '#10b981',
    fontWeight: '600',
  },
  actionGrid: {
    width: '90%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridBtnPrimary: {
    backgroundColor: '#3b82f6',
    width: '47%',
    aspectRatio: 1,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  gridBtnSecondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    width: '47%',
    aspectRatio: 1,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  btnSecondaryText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '600',
  },
  cameraContainer: {
    flex: 1,
    width: '100%',
  },
  camera: {
    flex: 1,
  },
  cameraControlsBtnContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: 30,
  },
  closeCameraBtn: {
    alignSelf: 'flex-end',
    marginTop: 20,
  },
  captureBtn: {
    alignSelf: 'center',
    marginBottom: 40,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCaptureBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
  }
});
