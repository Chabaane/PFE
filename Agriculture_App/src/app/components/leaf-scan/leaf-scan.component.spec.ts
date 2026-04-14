import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LeafScanComponent } from './leaf-scan.component';

describe('LeafScanComponent', () => {
  let component: LeafScanComponent;
  let fixture: ComponentFixture<LeafScanComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeafScanComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(LeafScanComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
