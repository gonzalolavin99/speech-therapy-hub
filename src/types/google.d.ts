declare namespace google {
  namespace accounts {
    namespace oauth2 {
      interface TokenClient {
        requestAccessToken(): void;
      }
      
      interface TokenClientConfig {
        client_id: string;
        scope: string;
        callback: (response: TokenResponse) => void;
      }
      
      interface TokenResponse {
        access_token: string;
        expires_in: number;
        error?: string;
        scope: string;
        token_type: string;
      }
      
      function initTokenClient(config: TokenClientConfig): TokenClient;
    }
  }
}
