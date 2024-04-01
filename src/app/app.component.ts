import { Component, OnInit } from '@angular/core';
import { BehaviorSubject, Observable, catchError, map, of, startWith } from 'rxjs';
import { AppState } from './interface/app-state';
import { CustomResponse } from './interface/custom-response';
import { ServerService } from './service/server.service';
import { DataState } from './enum/data-state.enum';
import { Status } from './enum/status.enum';
import { NgForm } from '@angular/forms';
import { Server } from './interface/server';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  appState$!: Observable<AppState<CustomResponse>>;
  readonly DataState = DataState;
  readonly Status = Status;
  private filterSubject = new BehaviorSubject<string>('');
  private dataSubject = new BehaviorSubject<CustomResponse | null>(null);
  filterStatus$ = this.filterSubject.asObservable();
  private isLoading = new BehaviorSubject<boolean>(false);
  isLoading$ = this.isLoading.asObservable();

  showOptions = false;
  showModal = false;
  activeOption = Status.ALL;
  showNotification = false;
  notificationMessage = '';

  constructor(private serverService: ServerService) {}

  ngOnInit(): void {
    this.showServers(true);
  }

  showServers(showNotif?: boolean): void {
    this.appState$ = this.serverService.servers$.pipe(
      map((response) => {
        this.dataSubject.next(response);
        if(showNotif) {
          this.showNotification = true;
          this.notificationMessage = 'All servers loaded successfully.';
          setTimeout(() => {
            this.closeNotification();
          }, 5000);
        }
        return { dataState: DataState.LOADED_STATE, appData: { ...response, data: { servers: response.data.servers.reverse().slice(0, 6) } } };
      }),
      startWith({ dataState: DataState.LOADING_STATE }),
      catchError((error: string) => {
        return of({ dataState: DataState.ERROR_STATE, error });
      })
    );
  }

  pingServer(ipAddress: string): void {
    this.showOptions = false;
    this.filterSubject.next(ipAddress);
    this.appState$ = this.serverService.ping$(ipAddress)
    .pipe(
      map((response) => {
        if (this.dataSubject.value?.data.servers) {
          const serverIndex = this.dataSubject.value?.data.servers.findIndex(server => server.id === response.data.server?.id);
          if (serverIndex !== -1) {
            /* The line `this.dataSubject.value.data.servers[serverIndex] = response.data.server!;` is
            updating the server information in the array of servers stored in the `data` property of
            the `CustomResponse` object. */
            this.dataSubject.value.data.servers[serverIndex] = response.data.server!;
          }
        }

        this.filterSubject.next('');
        return { dataState: DataState.LOADED_STATE, appData: this.dataSubject.value };
      }),
      startWith({ dataState: DataState.LOADED_STATE, appData: this.dataSubject.value }),
      catchError((error: string) => {
        this.filterSubject.next('');
        return of({ dataState: DataState.ERROR_STATE, error });
      })
    ) as Observable<AppState<CustomResponse>>;
  }

  filterServers(status: Status): void {
    this.activeOption = status;

    this.appState$ = this.serverService.filter$(status, this.dataSubject.value!)
    .pipe(
      map((response) => {
        // return { dataState: DataState.LOADED_STATE, appData: { ...response, data: { servers: response.data.servers.reverse().slice(0, 6) } } };
        return { dataState: DataState.LOADED_STATE, appData: response };
      }),
      startWith({ dataState: DataState.LOADED_STATE, appData: this.dataSubject.value }),
      catchError((error: string) => {
        return of({ dataState: DataState.ERROR_STATE, error });
      })
    ) as Observable<AppState<CustomResponse>>;
    
    this.showOptions = false;
  }

  filterByServerName(event: Event): void {
    const serverName = (event.target as HTMLInputElement).value;

    if(serverName) {
      this.appState$ = this.serverService.filterByName$(serverName, this.dataSubject.value!)
      .pipe(
        map((response) => {
          return { dataState: DataState.LOADED_STATE, appData: response };
        }),
        startWith({ dataState: DataState.LOADED_STATE, appData: this.dataSubject.value }),
        catchError((error: string) => {
          return of({ dataState: DataState.ERROR_STATE, error });
        })
      ) as Observable<AppState<CustomResponse>>;
    } else {
      this.showServers();
    }
  }

  saveServer(serverForm: NgForm): void {
    this.showOptions = false;
    this.isLoading.next(true);

    this.appState$ = this.serverService.save$(serverForm.value as Server)
    .pipe(
      map((response) => {
        this.dataSubject.next(
          { ...response, data: { servers: [response.data.server!, ...this.dataSubject.value!.data.servers] } }
        )
        this.isLoading.next(false);
        serverForm.resetForm({ status: this.Status.SERVER_DOWN });
        this.showModal = !this.showModal;
        // return { dataState: DataState.LOADED_STATE, appData: this.dataSubject.value };
        this.showNotification = true;
        this.notificationMessage = 'Server created successfully.';
        setTimeout(() => {
          this.closeNotification();
        }, 5000);
        return { dataState: DataState.LOADED_STATE, appData: { ...this.dataSubject.value, data: { servers: this.dataSubject.value?.data.servers.slice(0, 6) }} };
      }),
      startWith({ dataState: DataState.LOADED_STATE, appData: this.dataSubject.value }),
      catchError((error: string) => {
        this.isLoading.next(false);
        this.showModal = !this.showModal;
        return of({ dataState: DataState.ERROR_STATE, error });
      })
    ) as Observable<AppState<CustomResponse>>;
  }

  refreshData(): void {
    this.showOptions = false;
    this.appState$ = this.serverService.servers$.pipe(
      map((response) => {
        this.dataSubject.next(response);
        return { dataState: DataState.LOADED_STATE, appData: { ...response, data: { servers: response.data.servers.reverse().slice(0, 6) } } };
      }),
      startWith({ dataState: DataState.LOADING_STATE }),
      catchError((error: string) => {
        return of({ dataState: DataState.ERROR_STATE, error });
      })
    );
  }

  deleteServer(server: Server): void {
    this.showOptions = false;
    this.appState$ = this.serverService.delete$(server.id)
    .pipe(
      map((response) => {
        this.dataSubject.next(
          { ...response, data: { servers: this.dataSubject.value!.data.servers.filter(s => s.id !== server.id) } }
        )
        this.showNotification = true;
        this.notificationMessage = 'Server deleted successfully';
        setTimeout(() => {
          this.closeNotification();
        }, 5000);
        return { dataState: DataState.LOADED_STATE, appData: { ...this.dataSubject.value, data: { servers: this.dataSubject.value?.data.servers.slice(0, 6) }} };
      }),
      startWith({ dataState: DataState.LOADING_STATE, appData: this.dataSubject.value }),
      catchError((error: string) => {
        return of({ dataState: DataState.ERROR_STATE, error });
      })
    ) as Observable<AppState<CustomResponse>>;
  }

  printReport(): void {
    this.showOptions = false;
    // Print report
    window.print();

    // Excel report
    // let dataType = 'application/vnd.ms-excel.sheet.macroEnabled.12';
    // let tableSelect = document.getElementById('server-table');
    // let tableHtml = tableSelect?.outerHTML.replace(/ /g, '%20');
    // let downloadLink = document.createElement('a');
    // document.body.appendChild(downloadLink);
    // downloadLink.href = 'data:' + dataType + ', ' + tableHtml;
    // downloadLink.download = 'server-report.xls';
    // downloadLink.click();
    // document.body.removeChild(downloadLink);
  }

  toggleOptionsDisplay(): void {
    this.showOptions = !this.showOptions;
  }

  toggleModalDisplay(): void {
    this.showModal = !this.showModal;
  }

  closeNotification(): void {
    this.showNotification = false;
  }
}
