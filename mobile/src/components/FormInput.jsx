import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

export default function FormInput({ label, required, error, style, ...props }) {
  return (
    <View style={styles.container}>
      {label ? (
        <Text style={styles.label}>
          {label}{required ? <Text style={styles.required}> *</Text> : null}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={Colors.textLight}
        style={[
          styles.input,
          error && styles.inputError,
          props.multiline && styles.multiline,
          style,
        ]}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
  },
  required: {
    color: Colors.error,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.text,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  inputError: {
    borderColor: Colors.error,
    backgroundColor: Colors.errorLight,
  },
  multiline: {
    textAlignVertical: 'top',
    minHeight: 80,
  },
  error: {
    fontSize: 11,
    color: Colors.error,
    marginTop: 4,
  },
});
