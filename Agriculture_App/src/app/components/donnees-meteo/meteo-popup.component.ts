// meteo-popup.component.ts
import { Component, Input, OnInit } from '@angular/core';
import { MeteoService, MeteoPoint } from 'src/app/services/api/meteo.service';
import { from } from 'rxjs';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-meteo-popup',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './meteo-popup.component.html',
  styleUrls: ['./meteo-popup.component.scss']
})
export class MeteoPopupComponent implements OnInit {
  @Input() pointNom: string = '';
  @Input() latitude: number = 0;
  @Input() longitude: number = 0;

  meteoData?: MeteoPoint;
  loading: boolean = false;
  error: string = '';

  constructor(private meteoService: MeteoService) { }

  ngOnInit(): void {
    this.loadMeteo();
  }

  loadMeteo(): void {
    this.loading = true;
    this.meteoService.getMeteoForPoint(this.pointNom, this.latitude, this.longitude)
      .subscribe({
        next: (data) => {
          this.meteoData = data;
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Erreur de chargement météo';
          this.loading = false;
          console.error(err);
        }
      });
  }
}
