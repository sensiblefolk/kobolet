import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { IndexComponent } from './index.component';
import { LayoutModule } from '../../../layouts/layout.module';

// tslint:disable-next-line:max-line-length
import {MatFormFieldModule, MatInputModule, MatSortModule, MatPaginatorModule, MatTableModule, MatDialogModule, MatSnackBarModule, MatChipsModule} from '@angular/material';

import { SubheaderTypeSearchComponent } from '../subheader-type-search.component';

const routes: Routes = [
    {
        'path': '',
        'component': SubheaderTypeSearchComponent,
        'children': [
            {
                'path': '',
                'component': IndexComponent
            }
        ]
    }
];
@NgModule({
            imports: [
                CommonModule,
                MatTableModule,
                MatFormFieldModule,
                MatInputModule,
                MatChipsModule,
                MatSortModule,
                MatPaginatorModule,
                MatSnackBarModule,
                RouterModule.forChild(routes),
                LayoutModule
            ]
           ,exports: [
                RouterModule
            ],
           declarations: [
                IndexComponent
        ]})
export class IndexModule  {



}
