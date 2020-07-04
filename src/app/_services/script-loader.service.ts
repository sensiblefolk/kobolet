import { Injectable } from '@angular/core';
import * as $ from 'jquery';

interface Script {
  src: string;
  loaded: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ScriptLoaderService {
  public scripts: Script[] = [];

  /**
   * @deprecated
   * @param 'tag'
   * @param '{string} scripts'
   * @returns '{Promise<any[]>}'
   */
  load(tag: any, ...scripts: string[]): Promise<any> {
    scripts.forEach((src: string) => {
      if (!this.scripts[src]) {
        this.scripts[src] = { src, loaded: false };
      }
    });

    const promises: any[] = [];
    scripts.forEach((src) => promises.push(this.loadScript(tag, src)));

    return Promise.all(promises);
  }

  /**
   * Lazy load list of scripts
   * @param 'tag'
   * @param 'scripts'
   * @param 'loadOnce'
   * @returns '{Promise<any[]>}'
   */
  loadScripts(tag: string, scripts: any[], loadOnce?: boolean): Promise<any> {
    loadOnce = loadOnce || false;

    scripts.forEach((script: string) => {
      if (!this.scripts[script]) {
        this.scripts[script] = { src: script, loaded: false };
      }
    });

    const promises: any[] = [];
    scripts.forEach((script: string) =>
      promises.push(this.loadScript(tag, script, loadOnce))
    );

    return Promise.all(promises);
  }

  /**
   * Lazy load a single script
   * @param 'tag'
   * @param '{string} src'
   * @param 'loadOnce'
   * @returns '{Promise<any>}'
   */
  loadScript(tag: any, src: string, loadOnce?: boolean): Promise<any> {
    loadOnce = loadOnce || false;

    if (!this.scripts[src]) {
      this.scripts[src] = { src, loaded: false };
    }

    return new Promise((resolve, reject) => {
      // resolve if already loaded
      if (this.scripts[src].loaded && loadOnce) {
        resolve({ src, loaded: true });
      } else {
        // load script tag
        const scriptTag = $('<script/>')
          .attr('type', 'text/javascript')
          .attr('src', this.scripts[src].src);

        $(tag).append(scriptTag);

        this.scripts[src] = { src, loaded: true };
        resolve({ src, loaded: true });
      }
    });
  }
}
