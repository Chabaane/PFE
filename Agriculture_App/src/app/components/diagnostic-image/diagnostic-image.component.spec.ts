import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DiagnosticImageComponent } from './diagnostic-image.component';

describe('DiagnosticImageComponent', () => {
  let component: DiagnosticImageComponent;
  let fixture: ComponentFixture<DiagnosticImageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DiagnosticImageComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DiagnosticImageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
