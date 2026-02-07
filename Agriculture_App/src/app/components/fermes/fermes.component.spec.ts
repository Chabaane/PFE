import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FermesComponent } from './fermes.component';

describe('FermesComponent', () => {
  let component: FermesComponent;
  let fixture: ComponentFixture<FermesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FermesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FermesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
