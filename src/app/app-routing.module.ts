import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ArtistsComponent } from './artists/artists.component';
import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';

const routes: Routes = [
  { path: 'artists', component: ArtistsComponent },
  { path: '', component: HomeComponent }, //Default route
  { path: '**', component: AppComponent }, //Wildcard route (in case user try to go to non-existing page)
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
