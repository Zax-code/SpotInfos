import { Component, HostListener, OnInit } from '@angular/core';
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
function randomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

@Component({
  selector: 'app-artists',
  templateUrl: './artists.component.html',
  styleUrls: ['./artists.component.css'],
})
export class ArtistsComponent implements OnInit {
  artists: Artist[] = [];
  token: Token = {} as Token;
  subscription: any;
  artistPositions: number[] = [];
  highlightedIndex: number = 0;
  bubbles: string[] = [];
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  generateBubbles(n: number) {
    //get window width in vh
    const width = window.innerWidth;
    const height = window.innerHeight;
    //width in vh
    const widthInVh = (width / height) * 100;
    const usedPositions: { x: number; y: number; size: number }[] = [];

    for (let i = 0; i < n; i++) {
      const size = randomNumber(10, 60);
      const color = `hsl(${randomNumber(0, 360)}, 100%, ${randomNumber(
        70,
        90
      )}%)`;
      for (let j = 0; j < 100; j++) {
        //make sure bubbles don't overlap
        const x = randomNumber(0.2 * widthInVh, 0.8 * widthInVh - size / 2);
        const y = randomNumber(0, 10 * 105);
        const overlap = usedPositions.some((position) => {
          const xOverlap = Math.abs(x - position.x) < size + position.size;
          const yOverlap = Math.abs(y - position.y) < size + position.size;
          return xOverlap && yOverlap;
        });
        if (!overlap) {
          usedPositions.push({ x, y, size });
          break;
        }
      }

      const bubbleStyle = `top:${usedPositions[i].y}vh;left:${usedPositions[i].x}vh;width:${size}vh;height:${size}vh;background-color:${color}`;
      this.bubbles.push(bubbleStyle);
    }
  }

  calculateArtistPositions() {
    this.artistPositions = [];
    let artistElements = document.querySelectorAll(
      '.artist'
    ) as NodeListOf<HTMLElement>;
    for (let i = 0; i < artistElements.length; i++) {
      const artistHeight = artistElements[i].getBoundingClientRect().height;
      const artistTop = artistElements[i].offsetTop;
      this.artistPositions.push(artistTop + artistHeight / 2);
    }
  }

  //Adding host listener to window resize event
  @HostListener('window:resize', [])
  getArtistsPositions() {
    setTimeout(() => {
      this.calculateArtistPositions();
    }, 100);
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    let currentPosition = window.pageYOffset + window.innerHeight / 2;
    let closest = this.artistPositions.reduce((prev, curr) =>
      Math.abs(curr - currentPosition) < Math.abs(prev - currentPosition)
        ? curr
        : prev
    );
    let activeIndex = this.artistPositions.indexOf(closest);
    this.highlightedIndex = activeIndex;
  }
  getToken(code: string): Observable<Token> {
    const useToken = this.token.access_token && code.length == 0;

    const authBuffer = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString(
      'base64'
    );
    const body = new URLSearchParams({
      redirect_uri: 'https://spot-infos.vercel.app/',
      // redirect_uri: 'http://localhost:4200/',
      grant_type: useToken ? 'refresh_token' : 'authorization_code',
    });

    if (useToken) {
      if (this.token.expires_at > Date.now())
        return new Observable<Token>((observer) => {
          console.log('token still valid');
          this.token.expires_in = (this.token.expires_at - Date.now()) / 1000;
          observer.next(this.token);
        });

      console.log('token expired, refreshing...');
      body.set('refresh_token', this.token.refresh_token);
    } else {
      console.log('getting new token using code');
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
    const params = new URLSearchParams();
    params.set('time_range', 'short_term');
    params.set('limit', '10');
    return this.http.get<Artist[]>(
      `${BASEURI}/me/top/artists?${params.toString()}`,
      {
        headers: new HttpHeaders({
          Authorization: 'Bearer ' + token.access_token,
          'Content-Type': 'application/x-www-form-urlencoded',
        }),
      }
    );
  }

  ngOnInit(): void {
    this.token = JSON.parse(localStorage.getItem('token') as string) as Token;
    const state$ = this.route.paramMap.pipe(
      map(() => {
        const result = window.history.state;
        window.history.replaceState({}, '', window.location.pathname);
        return result;
      })
    );
    this.subscription = state$
      .pipe(map((state) => state.code || ''))
      .pipe(mergeMap((code) => this.getToken(code)))
      .pipe(mergeMap((token) => this.getArtist(token)))
      .pipe(catchError((_) => this.router.navigate(['/'])))
      .subscribe((artist) => {
        var items = artist.items;
        items = items.map((item: any) => {
          item.genres = item.genres.map(capitalize);
          return item;
        });
        this.artists = items as Artist[];
        console.log(this.artists);
        localStorage.setItem('token', JSON.stringify(this.token));
        this.getArtistsPositions();
        this.generateBubbles(20);
      });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
