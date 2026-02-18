import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FermeDetailsComponent } from './ferme-details.component';

describe('FermeDetailsComponent', () => {
  let component: FermeDetailsComponent;
  let fixture: ComponentFixture<FermeDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FermeDetailsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FermeDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
