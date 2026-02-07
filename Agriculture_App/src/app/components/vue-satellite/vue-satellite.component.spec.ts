import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VueSatelliteComponent } from './vue-satellite.component';

describe('VueSatelliteComponent', () => {
  let component: VueSatelliteComponent;
  let fixture: ComponentFixture<VueSatelliteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VueSatelliteComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(VueSatelliteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
