import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth/auth.service';
import type {
  MarianaClass,
  MarianaClassesResponse,
  BookingRequest,
  BookingResponse,
} from './types';

const BASE_URL = 'https://fusionfitness.marianatek.com/api/customer/v1';

@Injectable()
export class MarianaService {
  private readonly logger = new Logger(MarianaService.name);
  private readonly membershipId: string;

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    this.membershipId = this.configService.getOrThrow<string>('MEMBERSHIP_ID');
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: object,
  ): Promise<T> {
    const token = await this.authService.getAccessToken();

    const url = `${BASE_URL}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`API request failed: ${method} ${path} - ${response.status} - ${errorText}`);
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  async getClasses(
    date: string,
    locationId: string,
    regionId: string,
  ): Promise<MarianaClass[]> {
    const params = new URLSearchParams({
      min_start_date: date,
      max_start_date: date,
      page_size: '500',
      location: locationId,
      region: regionId,
    });

    const response = await this.request<MarianaClassesResponse>(
      'GET',
      `/classes?${params.toString()}`,
    );

    return response.results;
  }

  async getClassWithLayout(classId: string): Promise<MarianaClass> {
    return this.request<MarianaClass>('GET', `/classes/${classId}`);
  }

  async bookSpot(classId: string, spotId: string): Promise<BookingResponse> {
    const body: BookingRequest = {
      class_session: { id: classId },
      spot: { id: spotId },
      payment_option: { id: this.membershipId },
      is_booked_for_me: true,
      reservation_type: 'standard',
    };

    this.logger.log(`Booking spot ${spotId} for class ${classId}`);
    return this.request<BookingResponse>('POST', '/me/reservations', body);
  }

  async joinWaitlist(classId: string): Promise<BookingResponse> {
    const body: BookingRequest = {
      class_session: { id: classId },
      payment_option: { id: this.membershipId },
      is_booked_for_me: true,
      reservation_type: 'waitlist',
    };

    this.logger.log(`Joining waitlist for class ${classId}`);
    return this.request<BookingResponse>('POST', '/me/reservations', body);
  }
}
