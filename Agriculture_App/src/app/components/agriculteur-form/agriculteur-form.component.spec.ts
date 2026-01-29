import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AgriculteurFormComponent } from './agriculteur-form.component';

describe('AgriculteurFormComponent', () => {
  let component: AgriculteurFormComponent;
  let fixture: ComponentFixture<AgriculteurFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgriculteurFormComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AgriculteurFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
