import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FermesListComponent } from './fermes-list.component';

describe('FermesListComponent', () => {
  let component: FermesListComponent;
  let fixture: ComponentFixture<FermesListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FermesListComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FermesListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
