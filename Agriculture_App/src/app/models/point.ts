export interface Point {
  lat: number;
  lng: number;
  altitude?: number;
}

export interface PointWithElevation extends Point {
  elevation: number;
}
