import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

//Utility function to generate a random string
function generateRandomString(length: number): string {
  var text = '';
  var possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

//Component
@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent {
  getSpotifyAuth(): void {
    const baseURL = 'https://accounts.spotify.com/authorize?';
    const state = generateRandomString(16);
    const client_id = 'e92b023779e94b9ca4789731695eced1';
    const scope = [
      'user-read-currently-playing',
      'playlist-read-private',
      'playlist-read-collaborative',
      'user-follow-read',
      'user-read-playback-position',
      'user-top-read',
      'user-read-recently-played',
    ];
    var redirect_uri = 'https://spot-infos.vercel.app/';
    // redirect_uri = 'http://localhost:4200/';
    const response_type = 'code';

    const params = new URLSearchParams({
      client_id,
      scope: scope.join(' '),
      redirect_uri,
      response_type,
      state,
    });

    const url = baseURL + params.toString();
    window.location.href = url;
  }

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      if (params['code'])
        this.router.navigate(['/artists'], { state: { code: params['code'] } });
    });
  }
}
