export interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  refresh_token: string;
}

export interface MarianaClassType {
  id: string;
  name: string;
  description: string;
  duration: number;
  duration_formatted: string;
  is_live_stream: boolean;
}

export interface MarianaLocation {
  id: string;
  name: string;
  address_line_one: string;
  city: string;
  state_province: string;
  postal_code: string;
  timezone: string;
  region: {
    id: string;
    name: string;
  };
}

export interface MarianaSpot {
  id: string;
  name: string;
  spot_type: {
    id: string;
    is_primary: boolean;
    name: string;
  };
  x_position: number;
  y_position: number;
  is_available: boolean;
}

export interface MarianaLayout {
  id: string;
  name: string;
  spots: MarianaSpot[];
}

export interface MarianaInstructor {
  id: string;
  name: string;
  bio: string;
  instagram_handle: string;
}

export interface MarianaClass {
  id: string;
  name: string;
  available_spot_count: number;
  booking_start_datetime: string;
  capacity: number;
  class_type: MarianaClassType;
  classroom: {
    id: string;
    name: string;
  };
  classroom_name: string;
  instructors: MarianaInstructor[];
  is_cancelled: boolean;
  is_user_reserved: boolean;
  is_user_waitlisted: boolean;
  layout_format: 'pick-a-spot' | 'first-come-first-serve';
  location: MarianaLocation;
  start_date: string;
  start_time: string;
  start_datetime: string;
  status: string | null;
  waitlist_count: number;
  layout?: MarianaLayout;
}

export interface MarianaClassesResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: MarianaClass[];
}

export interface BookingRequest {
  class_session: { id: string };
  spot?: { id: string };
  payment_option: { id: string };
  is_booked_for_me: boolean;
  reservation_type: 'standard' | 'waitlist';
}

export interface BookingResponse {
  id: string;
  is_booked_by_me: boolean;
  is_booked_for_me: boolean;
  reservation_type: string;
  spot: MarianaSpot | null;
  status: string;
  waitlist_position: number | null;
  class_session: MarianaClass;
}
