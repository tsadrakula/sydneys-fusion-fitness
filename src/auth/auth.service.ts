import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { TokenResponse } from '../mariana/types';

const TOKEN_URL = 'https://fusionfitness.marianatek.com/o/token/';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  private readonly clientId: string;
  private readonly refreshToken: string;

  constructor(private readonly configService: ConfigService) {
    this.clientId = this.configService.getOrThrow<string>('MARIANA_CLIENT_ID');
    this.refreshToken = this.configService.getOrThrow<string>('MARIANA_REFRESH_TOKEN');
  }

  /**
   * Always fetches a fresh access token before booking.
   * Retries up to MAX_RETRIES times on failure.
   */
  async getAccessToken(): Promise<string> {
    this.logger.log('Fetching fresh access token...');

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const token = await this.fetchToken();
        this.logger.log('Access token fetched successfully');
        return token;
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(
          `Token fetch attempt ${attempt}/${MAX_RETRIES} failed: ${lastError.message}`,
        );

        if (attempt < MAX_RETRIES) {
          this.logger.log(`Retrying in ${RETRY_DELAY_MS}ms...`);
          await this.sleep(RETRY_DELAY_MS);
        }
      }
    }

    this.logger.error(`All ${MAX_RETRIES} token fetch attempts failed`);
    throw lastError;
  }

  private async fetchToken(): Promise<string> {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: this.refreshToken,
      client_id: this.clientId,
    });

    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token refresh failed: ${response.status} - ${errorText}`);
    }

    const tokenData = (await response.json()) as TokenResponse;
    return tokenData.access_token;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
