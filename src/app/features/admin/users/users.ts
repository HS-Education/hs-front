import { ChangeDetectionStrategy, Component, inject, OnInit, signal, computed } from '@angular/core';
import { forkJoin, of, Observable } from 'rxjs';
import { UserService } from './services/user.service';
import { User, AVAILABLE_ROLES } from './models/user.model';
import { ToastService } from '../../../shared/services/toast.service';
import { Modal } from '../../../shared/components/modal/modal';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslateEnumPipe } from '../../../shared/pipes/translate-enum.pipe';
import { NgClass } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { StyledSelectDirective } from '../../../shared/directives/styled-select.directive';
import { generateSecurePassword } from '../../../shared/security/secure-password';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [Modal, FormsModule, TranslateEnumPipe, NgClass, TranslocoPipe, StyledSelectDirective],
  templateUrl: './users.html',
  styleUrl: './users.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Users implements OnInit {
  private readonly userService = inject(UserService);
  private readonly toastService = inject(ToastService);

  readonly users = signal<User[]>([]);
  readonly isLoading = signal(false);
  
  // Filters
  readonly filterName = signal('');
  readonly filterRole = signal('');
  
  readonly filteredUsers = computed(() => {
    let result = this.users();
    const name = this.filterName().toLowerCase();
    const role = this.filterRole();

    if (name) {
      result = result.filter(u => u.name.toLowerCase().includes(name));
    }
    if (role) {
      result = result.filter(u => u.roles.includes(role));
    }
    
    return result;
  });
  
  clearFilters() {
    this.filterName.set('');
    this.filterRole.set('');
  }
  
  // Form State
  readonly isModalOpen = signal(false);
  readonly isSubmitting = signal(false);
  readonly editingUser = signal<User | null>(null);
  readonly availableRoles = AVAILABLE_ROLES;

  readonly newName = signal('');
  readonly newPassword = signal('');
  readonly selectedRoles = signal<string[]>([]);

  readonly isFormValid = computed(() => {
    if (this.editingUser()) {
      return this.selectedRoles().length > 0;
    }
    return this.newName().trim().length > 0 && 
           this.newPassword().length >= 8 && 
           this.selectedRoles().length > 0;
  });

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.isLoading.set(true);
    this.userService.getAllUsers().subscribe({
      next: (data) => {
        this.users.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  openModal(user?: User) {
    if (user) {
      this.editingUser.set(user);
      this.selectedRoles.set([...user.roles]);
      this.newName.set('');
      this.newPassword.set('');
    } else {
      this.editingUser.set(null);
      this.newName.set('');
      this.newPassword.set('');
      this.selectedRoles.set([]);
    }
    this.isModalOpen.set(true);
  }

  closeModal = () => {
    this.isModalOpen.set(false);
    this.editingUser.set(null);
  }

  toggleRole(roleId: string) {
    let current = [...this.selectedRoles()];
    
    if (current.includes(roleId)) {
      current = current.filter(r => r !== roleId);
    } else {
      current.push(roleId);
      
      // Mutual exclusion logic
      if (roleId === 'STUDENT') {
        current = current.filter(r => r !== 'TEACHER' && r !== 'COORDINATOR');
      } else if (roleId === 'TEACHER' || roleId === 'COORDINATOR') {
        current = current.filter(r => r !== 'STUDENT');
      }
    }
    
    this.selectedRoles.set(current);
  }

  generatePassword() {
    this.newPassword.set(generateSecurePassword());
  }

  submitUser() {
    if (!this.isFormValid()) return;
    this.isSubmitting.set(true);

    const userToEdit = this.editingUser();

    if (userToEdit) {
      // Edit logic
      const originalRoles = userToEdit.roles;
      const newRoles = this.selectedRoles();

      const rolesToAdd = newRoles.filter(r => !originalRoles.includes(r));
      const rolesToRemove = originalRoles.filter(r => !newRoles.includes(r));

      const requests: Observable<any>[] = [];

      // Helper to find DB ID
      const getDbId = (roleStr: string) => this.availableRoles.find(ar => ar.id === roleStr)?.dbId;

      rolesToAdd.forEach(r => {
        const dbId = getDbId(r);
        if (dbId) requests.push(this.userService.addRole(userToEdit.id, dbId));
      });

      rolesToRemove.forEach(r => {
        const dbId = getDbId(r);
        if (dbId) requests.push(this.userService.removeRole(userToEdit.id, dbId));
      });

      if (requests.length === 0) {
        this.isSubmitting.set(false);
        this.closeModal();
        return;
      }

      forkJoin(requests).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.closeModal();
          this.loadUsers();
        },
        error: () => {
          this.isSubmitting.set(false);
        }
      });

    } else {
      // Create logic
      this.userService.registerUser({
        name: this.newName().trim(),
        password: this.newPassword(),
        roles: this.selectedRoles()
      }).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.closeModal();
          this.loadUsers();
        },
        error: () => {
          this.isSubmitting.set(false);
        }
      });
    }
  }
}
