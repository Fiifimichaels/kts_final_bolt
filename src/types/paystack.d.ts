// Paystack type definitions
declare global {
  interface Window {
    PaystackPop: {
      setup: (config: PaystackConfig) => {
        openIframe: () => void;
      };
    };
  }
}

interface PaystackConfig {
  key: string;
  email: string;
  amount: number;
  currency?: string;
  reference: string;
  metadata?: {
    booking_ids?: string[]; // corrected to be plural and an array
    customer_name: string;
    passenger_count?: number;
    custom_fields?: Array<{
      display_name: string;
      variable_name: string;
      value: string;
    }>;
  };
  onSuccess?: (transaction: PaystackTransaction) => void;
  onCancel?: () => void;
  onClose?: () => void;
}

interface PaystackTransaction {
  reference: string;
  status: string;
  trans: string;
  transaction: string;
  trxref: string;
  redirecturl?: string;
}

export {};
