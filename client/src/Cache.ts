/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
import { IComponent } from './models/AbacusComponents';

//interface CacheObject { [index: number]: IComponent }

export class Cache {

    private readonly cacheName = "cache.json";
    private static instance: Cache;
    private cache: IComponent[] = [];

    private constructor(private context: vscode.ExtensionContext) {
        this.cache = this.context.globalState.get<IComponent[]>(this.cacheName, []);
        // console.log(this.cache);
    }

    public static getInstance(context: vscode.ExtensionContext) {
        if (!Cache.instance) {
            Cache.instance = new Cache(context);
        }
        return Cache.instance;
    }

    public put(item: IComponent): number {
        // console.log(`Adding ${item.Name} to memory cache.`);
        let foundIndex = this.cache.findIndex(e => e.EEID === item.EEID);
        if (foundIndex > -1) {
            // Update item
            this.cache[foundIndex] = item;
            return foundIndex;
        }
        else {
            // Add item
            let len = this.cache.push(item);
            return len - 1;
        }
    }

    public get(componentTypeName: string, filter: string): IComponent[] {
        // Do a search
        let items = this.cache.filter(n => n.Name.toLowerCase().startsWith(filter.toLowerCase()) && n.ComponentTypeName === componentTypeName).sort((a, b) => a.Name.localeCompare(b.Name));
        return items.slice(0, 20);
    }

    public async save() {
        console.log("Attempting to save Cache.");
        // console.log(this.cache);
        await this.context.globalState.update(this.cacheName, this.cache);
        // console.log("Cache contents saved.");
    }

    public async clear() {
        this.cache = [];
        await this.context.globalState.update(this.cacheName, []);
        console.log("Cache contents has been cleared.");
    }
}