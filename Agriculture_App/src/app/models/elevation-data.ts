export interface ElevationData {
  latitude: number;
  longitude: number;
  elevation: number;
}

export interface ElevationResponse {
  results: ElevationData[];
}
