export interface SmsProvider {
  sendOtp(input: {
    phone: string;
    code: string;
  }): Promise<void>;
}
