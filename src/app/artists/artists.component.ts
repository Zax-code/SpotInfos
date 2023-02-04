import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, map, mergeMap, Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Artist } from '../artist';
// import { Artist } from '../artist';
const BASEURI = 'https://api.spotify.com/v1';
const CLIENT_ID = 'e92b023779e94b9ca4789731695eced1';
const CLIENT_SECRET = 'd64ce5d8f3ea484ca8b3e87d4d72d740';
const Buffer = require('buffer').Buffer;

interface Token {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token: string;
  expires_at: number;
}

function capitalize(str: string): string {
  const words = str.split(' ');
  const capitalizedWords = words.map((word) => {
    return word[0].toUpperCase() + word.slice(1);
  });
  return capitalizedWords.join(' ');
}

@Component({
  selector: 'app-artists',
  templateUrl: './artists.component.html',
  styleUrls: ['./artists.component.css'],
})
export class ArtistsComponent implements OnInit {
  artists: Artist[] = [];
  token?: Token;
  subscription: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  getToken(code: string, useCode: boolean = false): Observable<Token> {
    console.log('getToken, code : ', code);

    const authBuffer = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString(
      'base64'
    );
    const body = new URLSearchParams({
      redirect_uri: 'http://localhost:4200/',
      grant_type: this.token ? 'refresh_token' : 'authorization_code',
    });

    if (this.token && !useCode) {
      if (this.token.expires_at > Date.now())
        return new Observable<Token>((observer) => {
          console.log('token still valid');
          if (this.token)
            this.token.expires_in = (this.token.expires_at - Date.now()) / 1000;
          observer.next(this.token);
        });
      console.log('token expired, refreshing...');

      body.set('refresh_token', this.token.refresh_token);
    } else {
      body.set('code', code);
    }

    const headers = new HttpHeaders({
      Authorization: `Basic ${authBuffer}`,
    }).set('Content-Type', 'application/x-www-form-urlencoded');

    return this.http
      .post<Token>(`https://accounts.spotify.com/api/token`, body.toString(), {
        headers,
      })
      .pipe(
        map((token) => {
          token.expires_at = Date.now() + token.expires_in * 1000;
          if (!token.refresh_token && this.token)
            token.refresh_token = this.token.refresh_token;

          this.token = token;
          return token;
        })
      );
  }

  getArtist(token: Token): Observable<any> {
    console.log('getArtist, token : ', token);
    return this.http.get<Artist[]>(`${BASEURI}/me/top/artists`, {
      headers: new HttpHeaders({
        Authorization: 'Bearer ' + token.access_token,
      }).set('Content-Type', 'application/x-www-form-urlencoded'),
    });
  }

  ngOnInit(): void {
    this.token = JSON.parse(localStorage.getItem('token') as string) as Token;
    const state$ = this.route.paramMap.pipe(
      map(() => {
        const result = window.history.state;
        console.log('result : ', result);
        window.history.replaceState({}, '', window.location.pathname);
        return result;
      })
    );
    try {
      this.subscription = state$
        .pipe(map((state) => state.code))
        .pipe(
          mergeMap((code) =>
            this.getToken(code).pipe(
              catchError((_) => this.getToken(code, true))
            )
          )
        )
        .pipe(mergeMap((token) => this.getArtist(token)))
        .subscribe((artist) => {
          var items = artist.items;
          items = items.map((item: any) => {
            item.genres = item.genres.map(capitalize);
            return item;
          });
          this.artists = items as Artist[];
          localStorage.setItem('token', JSON.stringify(this.token));
        });
    } catch (e) {
      this.router.navigate(['/']);
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    localStorage.setItem('token', JSON.stringify(this.token));
  }
}
