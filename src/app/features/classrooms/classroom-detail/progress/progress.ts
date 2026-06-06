import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { UserDataService } from '../../../../shared/services/user-data.service';

@Component({
  selector: 'app-progress',
  imports: [],
  templateUrl: './progress.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Progress {
  protected readonly userDataService = inject(UserDataService);
}
