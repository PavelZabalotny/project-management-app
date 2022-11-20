import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  forkJoin,
  mergeMap,
  Observable,
  of,
  Subscription,
} from 'rxjs';
import {
  IColumnFull,
  TColumn,
  TNewColumn,
} from '../interfaces/column.interface';
import { ApiColumnsService } from './api-columns.service';

@Injectable()
export class ColumnsService {
  private columnsData = new BehaviorSubject<IColumnFull[]>([]);

  private isLoading = new BehaviorSubject<boolean>(false);

  constructor(private apiColumns: ApiColumnsService) {}

  public get columns$(): Observable<IColumnFull[]> {
    return this.columnsData.asObservable();
  }

  public get columns(): IColumnFull[] {
    return this.columnsData.value;
  }

  public get isLoading$(): Observable<boolean> {
    return this.isLoading.asObservable();
  }

  public loadAll(boardId: string) {
    this.isLoading.next(true);
    return this.apiColumns
      .getAll(boardId)
      .pipe(
        mergeMap((columns) => {
          if (!columns.length) return of([]);

          return forkJoin(
            columns.map((item) => this.apiColumns.getById(boardId, item.id)),
          );
        }),
      )
      .subscribe((columns: IColumnFull[]) => {
        this.columnsData.next(columns);
        this.isLoading.next(false);
      });
  }

  public create(column: TNewColumn, boardId: string): void {
    this.apiColumns.create(boardId, column).subscribe((newColumn) => {
      const fullColumn = {
        ...newColumn,
        tasks: [],
      };
      const newColumns = [...this.columnsData.value, fullColumn];
      this.columnsData.next(newColumns);
    });
  }

  public delete(columnId: string, boardId: string): void {
    this.apiColumns.delete(boardId, columnId).subscribe(() => {
      const newColumns = this.columnsData.value.filter(
        (column) => column.id !== columnId,
      );
      this.columnsData.next(newColumns);
    });
  }

  public setColumns(newColumns: IColumnFull[]): void {
    this.columnsData.next(newColumns);
  }

  public refreshAll(boardId: string): Subscription {
    return this.apiColumns
      .getAll(boardId)
      .pipe(
        mergeMap((columns) => {
          if (!columns.length) return of([]);

          return forkJoin(
            columns.map((item) => this.apiColumns.getById(boardId, item.id)),
          );
        }),
      )
      .subscribe((columns: IColumnFull[]) => {
        this.columnsData.next(columns);
      });
  }

  public put(
    boardId: string,
    column: TColumn,
    order?: number,
  ): Observable<TColumn> {
    return this.apiColumns.put(boardId, column, order);
  }

  public update(
    newColumn: TColumn,
    boardId: string,
    order: number,
  ): Subscription {
    return this.apiColumns
      .put(boardId, newColumn, order)
      .subscribe((column) => {
        const columnIndex: number = this.columnsData.value.findIndex(
          ({ id }) => id === column.id,
        );
        const currentColumns: IColumnFull[] = [...this.columnsData.value];
        const newItem = {
          ...currentColumns[columnIndex],
          title: column.title,
          order,
        };
        currentColumns.splice(columnIndex, 1, newItem);
        this.columnsData.next(currentColumns);
      });
  }
}
