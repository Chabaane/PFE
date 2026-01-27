import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatSurface',
})
export class FormatSurfacePipe implements PipeTransform {

  transform(value: unknown, ...args: unknown[]): unknown {
    return null;
  }

}
