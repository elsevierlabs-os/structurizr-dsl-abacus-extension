import * as vscode from 'vscode';
import { URLSearchParams } from 'url';
import { HttpClient, HttpClientResponse } from 'typed-rest-client/HttpClient';
import { IHeaders, IRequestOptions } from 'typed-rest-client/Interfaces';
import { getUrl } from 'typed-rest-client/Util';
import * as hm from 'typed-rest-client/Handlers';
import { join } from 'path';
import { IAbacusComponents, IComponent } from './models/AbacusComponents';
import * as fileSystem from 'fs';
import { Cache } from './Cache';
import { IAbacusConnections } from './models/AbacusConnections';
import { AbacusSession } from './provider/authentication-provider/AbacusSession';
import {v4 as uuidv4} from 'uuid';
import AbacusAuthenticationProvider from './provider/authentication-provider/AbacusAuthenticationProvider';

export class AbacusClient {

    private static _context: vscode.ExtensionContext;
    private static _cache: Cache;
    private static _instance: HttpClient;
    private static _options: IRequestOptions;
    private static _baseurl: string;
    private static _eeid: number;
    private static _busy: boolean;

    private constructor() {
        // Singleton pattern, block from public construction
        const version = vscode.extensions.getExtension('gfrsoftware.structurizr-dsl-abacus-extension')?.packageJSON.version;
        const host = vscode.workspace.getConfiguration('abacus').get('host');
        const port = vscode.workspace.getConfiguration('abacus').get('port');
        const api = vscode.workspace.getConfiguration('abacus').get('api');
        const enforceSSL = vscode.workspace.getConfiguration('abacus').get('secure');
        const useragent = `vscode/${vscode.version} structurizr/${version}`;
        AbacusClient._baseurl = `https://${host}:${port}${api}`;
        AbacusClient._options = {};
        AbacusClient._options.ignoreSslError = !enforceSSL;
        AbacusClient._instance = new HttpClient(useragent, undefined, AbacusClient._options);
        AbacusClient._eeid = vscode.workspace.getConfiguration('abacus').get<number>('eeid', 0);
        AbacusClient._busy = false;
    }

    public static getInstance(): HttpClient {
        if (AbacusClient._instance === undefined) {
            new AbacusClient();
        }
        return AbacusClient._instance;
    }

    public static async initCache(context: vscode.ExtensionContext) {
        if (AbacusClient._instance === undefined) {
            new AbacusClient();
        }
        if (AbacusClient._busy)
        {
            console.log('Cache being told to init but is already busy. Ignoring');
            return;
        }
        AbacusClient._busy = true;
        // Ensure we have a cache object
        AbacusClient._cache = Cache.getInstance(context);
        // TEMPORARY - Clear cache
        // await AbacusClient._cache.clear();
        // Get component types
        var typeList: string[] = new Array();
        typeList.push(vscode.workspace.getConfiguration('abacus').get<string>('c4SoftwareSystem', 'Software System'));
        typeList.push(vscode.workspace.getConfiguration('abacus').get<string>('c4Container','Container'));
		typeList.push(vscode.workspace.getConfiguration('abacus').get<string>('c4Component','Component'));
        // Load data from API into cache, assume 20 values per page
        vscode.window.withProgress({
            title: 'Building local Abacus cache',
            location: vscode.ProgressLocation.Notification,
            cancellable: true
        }, async (progress, token) => {
            for (var componentTypeName of typeList){
                let page =0;
                let loading = true;
                if (token.isCancellationRequested){
                    break;
                }
                console.log(`Building cache of ${componentTypeName} Abacus components`);
                do {
                    console.log(`Loading page ${page} of Abacus ${componentTypeName} components.`);
                    let data = await AbacusClient.getSystemsDataset(componentTypeName, "", page);
                    if (data) {
                        let increment: number = 100 / data['@odata.count'];
                        for (var item of data.value) {
                            AbacusClient._cache.put(item);
                        }
                        await AbacusClient._cache.save();
                        let fraction: number = data.value.length * increment;
                        progress.report({message: `Loaded ${componentTypeName} page: ${page}`, increment: fraction});
                        if (data.value.length < 20) {
                            loading = false;
                        }
                        else {
                            page++;
                        }
                    }
                    else {
                        loading = false;
                    }
                } while (loading && !token.isCancellationRequested);
            }
        });
        AbacusClient._busy = false;
    }


    public static async saveCache() {
        if (AbacusClient._cache) {
            await AbacusClient._cache.save();
        }
    }

    public static setOptions(newOptions: IRequestOptions) {
        AbacusClient._options = newOptions;
    }

    public static async createSession(username: string, password: string) : Promise<AbacusSession | undefined> {

        var client = this.getInstance();
        let headers: IHeaders = {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'Accept': 'application/json',
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'cache-control': 'no-cache',
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'Content-Type': 'application/x-www-form-urlencoded',
        };
        const formData = new URLSearchParams();
        formData.append('grant_type', 'password');
        formData.append('username', username);
        formData.append('password', password);
        const request = formData.toString();

        let targeturl = getUrl('Token', AbacusClient._baseurl);

        try {
            let restRes: HttpClientResponse = await client.post(targeturl, request, headers);
            console.log(restRes.message.statusCode);
            if (restRes.message.statusCode === 200) {
                // store token values
                let contents = await restRes.readBody();
                let object = JSON.parse(contents);
                console.log(object.access_token);
                let expiryDate = new Date();
                expiryDate.setSeconds(expiryDate.getSeconds() + object.expires_in);
                let stringy = JSON.stringify(expiryDate);
                console.log(`Expiry date: ${expiryDate} or ${stringy}`);
                let uid = uuidv4();
                let newSession = new AbacusSession(
                    uid,
                    object.access_token,
                    object.refresh_token,
                    expiryDate,
                    {id: username, label: username},
                    []
                );
                vscode.window.showInformationMessage("Abacus login succeeded.");
                return newSession;
            }
            else {
                return undefined;
            }
        }
        catch (err) {
            console.log(err);
            return undefined;
        }
    }

    public static async refreshSession(session: AbacusSession) : Promise<AbacusSession | undefined> {
        var client = this.getInstance();
        let headers: IHeaders = {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'Accept': 'application/json',
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'cache-control': 'no-cache',
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'Content-Type': 'application/x-www-form-urlencoded',
        };
        const formData = new URLSearchParams();
        formData.append('grant_type', 'refresh_token');
        formData.append('refresh_token', session.refreshToken);
        const request = formData.toString();

        let targeturl = getUrl('Token', AbacusClient._baseurl);

        try {
            let restRes: HttpClientResponse = await client.post(targeturl, request, headers);
            console.log(restRes.message.statusCode);
            if (restRes.message.statusCode === 200) {
                // create new session to return
                let uid = uuidv4();
                let contents = await restRes.readBody();
                let object = JSON.parse(contents);
                console.log(object.access_token);
                let expiryDate = new Date();
                expiryDate.setSeconds(expiryDate.getSeconds() + object.expires_in);
                let stringy = JSON.stringify(expiryDate);
                console.log(`Expiry date: ${expiryDate} or ${stringy}`);
                const newSession = new AbacusSession(
                    uid,
                    object.access_token,
                    object.refresh_token,
                    expiryDate,
                    session.account,
                    []
                );
                return newSession;
            }
            else {
                console.log('Refresh of Abacus token failed.');
                vscode.window.showErrorMessage("Abacus token refresh failed. Login required.");
            }
        }
        catch (err) {
            console.log(err);
            vscode.window.showErrorMessage("Abacus token refresh failed. Login required.");
        }
    }

    public static async getSystems(componentTypeName: string, filter: string, page: number = 0, useCache: boolean = true): Promise<vscode.CompletionItem[]> {
        if (AbacusClient._instance === undefined) {
            new AbacusClient();
        }
        let items: vscode.CompletionItem[] = [];
        // Check cache if requested
        if (AbacusClient._cache && useCache) {
            console.log("Checking cache for items.");
            let results = AbacusClient._cache.get(componentTypeName, filter);
            if (results.length > 0) {
                for (var item of results) {
                    let newItem = new vscode.CompletionItem(item.Name, vscode.CompletionItemKind.Field);
                    newItem.insertText = `"${item.Name}" "${item.Description}"`;
                    newItem.detail = item.EEID.toString();
                    items.push(newItem);
                }
            }
        }
        // Call API if no cache hit or cache was skipped
        if (items.length < 1) {
            console.log("Calling Abacus API for items.");
            let abacusDS = await AbacusClient.getSystemsDataset(componentTypeName, filter, page);
            if (abacusDS) {
                for (var item of abacusDS.value) {
                    let newItem = new vscode.CompletionItem(item.Name, vscode.CompletionItemKind.Field);
                    newItem.insertText = `"${item.Name}" "${item.Description}"`;
                    newItem.detail = item.EEID.toString();
                    items.push(newItem);
                }
            }
        }

        return items;
    }

    static async getSystemsDataset(componentTypeName: string, filter: string, page: number): Promise<IAbacusComponents | undefined> {
        // Get session
        const session = await vscode.authentication.getSession(AbacusAuthenticationProvider.id, [], {createIfNone: true});
        // Fetch a case insensitive match of applications starting with the filter string.
        // The ODATA example query is as follows:
        // {{baseUrl}}/Components?$filter=Architecture/EEID eq 4929 and ComponentType/name eq 'Application' and startsWith(tolower(Name), 'sales')
        //                       &$orderby=Name&$count=true&$top=20&$select=EEID,Name,Description

        let architectureid = encodeURIComponent(AbacusClient._eeid);
        let lowerFilter = encodeURIComponent(filter.toLowerCase());
        let queryString = `Components?$filter=Architecture/EEID eq ${architectureid} and ComponentType/name eq '${componentTypeName}'`;
        if (lowerFilter.length > 0) {
            queryString = queryString + ` and startsWith(tolower(Name), '${lowerFilter}')`;
        }
        queryString = queryString + '&$orderby=Name&$count=true&$top=20&$select=EEID,Name,Description,ComponentTypeName';
        // We use a zero based page structure so page 0 is the first 20 and page 1 is the next 20, etc
        if (page > 0) {
            let skip = page * 20;
            queryString = queryString + `&$skip=${skip}`;
        }

        try {
            let client = this.getInstance();
            let targeturl = getUrl(queryString, AbacusClient._baseurl);
            console.log('getSystemsDataset making call to ' + targeturl);
            let headers: IHeaders = {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'Accept': 'application/json',
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'Authorization': `Bearer ${session.accessToken}`
            };
            let res: HttpClientResponse = await client.get(targeturl, headers);
            if (res.message.statusCode === 200) {
                let payload = await res.readBody();
                let dataset: IAbacusComponents = JSON.parse(payload);
                return dataset;
            }
            else {
                vscode.window.showErrorMessage("Abacus system fetch failed with HTTP response code " + res.message.statusCode);
            }
        }
        catch (err) {
            console.log(err);
            vscode.window.showErrorMessage("Abacus system fetch failed with error " + err);
        }
    }

    static async getEntityDetails(eeid: string):Promise< IComponent | undefined >
    {
        // Get session
        const session = await vscode.authentication.getSession(AbacusAuthenticationProvider.id, [], {createIfNone: true});
        let architectureid = encodeURIComponent(AbacusClient._eeid);
        let queryString = `Components(${eeid})`;
        try {
            let client = this.getInstance();
            let targeturl = getUrl(queryString, AbacusClient._baseurl);
            let headers: IHeaders = {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'Accept': 'application/json',
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'Authorization': `Bearer ${session.accessToken}`
            };
            let res: HttpClientResponse = await client.get(targeturl, headers);
            if (res.message.statusCode === 200) {
                let payload = await res.readBody();
                let entity: IComponent = JSON.parse(payload);
                return entity;
            }
            else {
                vscode.window.showErrorMessage("Abacus system fetch failed with HTTP response code " + res.message.statusCode);
            }
        }
        catch (err) {
            console.log(err);
            vscode.window.showErrorMessage("Abacus system fetch failed with error " + err);
        }
    }

    static async getChildren(parentEeid: string, componentTypeName: string, filter: string, page: number): Promise<IAbacusComponents | undefined> {
        // Get session
        const session = await vscode.authentication.getSession(AbacusAuthenticationProvider.id, [], {createIfNone: true});
        // Fetch a case insensitive match of components starting with the filter string.
        // The ODATA example query is as follows:
        // {{baseUrl}}/Components?$filter=Architecture/EEID eq 4929 and ComponentType/name eq 'Container' and ParentEEID eq 5041397 
        //            &$select=EEID,Name,Description,ParentEEID
        let architectureid = encodeURIComponent(AbacusClient._eeid);
        let lowerFilter = encodeURIComponent(filter.toLowerCase());
        let queryString = `Components?$filter=Architecture/EEID eq ${architectureid} and ComponentType/name eq '${componentTypeName}' and ParentEEID eq ${parentEeid}`;
        if (lowerFilter.length > 0) {
            queryString = queryString + ` and startsWith(tolower(Name), '${lowerFilter}')`;
        }
        queryString = queryString + '&$orderby=Name&$count=true&$top=20&$select=EEID,Name,Description,ComponentTypeName';

        // We use a zero based page structure so page 0 is the first 20 and page 1 is the next 20, etc
        if (page > 0) {
            let skip = page * 20;
            queryString = queryString + `&$skip=${skip}`;
        }

        try {
            let client = this.getInstance();
            let targeturl = getUrl(queryString, AbacusClient._baseurl);
            let headers: IHeaders = {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'Accept': 'application/json',
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'Authorization': `Bearer ${session.accessToken}`
            };
            let res: HttpClientResponse = await client.get(targeturl, headers);
            if (res.message.statusCode === 200) {
                let payload = await res.readBody();
                let dataset: IAbacusComponents = JSON.parse(payload);
                return dataset;
            }
            else {
                vscode.window.showErrorMessage("Abacus system fetch failed with HTTP response code " + res.message.statusCode);
            }
        }
        catch (err) {
            console.log(err);
            vscode.window.showErrorMessage("Abacus system fetch failed with error " + err);
        }
    }

    static async getConnections(eeid: string) : Promise<IAbacusConnections | undefined> {
        // Get session
        const session = await vscode.authentication.getSession(AbacusAuthenticationProvider.id, [], {createIfNone: true});
        // Fetch all the connections for a given component
        // The ODATA example query is as follows:
        // {{baseUrl}}/Components(5041432)/AllConnections?$count=true
        let architectureid = encodeURIComponent(AbacusClient._eeid);
        let queryString = `Components(${eeid})/AllConnections?$count=true`;
        try {
            let client = this.getInstance();
            let targeturl = getUrl(queryString, AbacusClient._baseurl);
            let headers: IHeaders = {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'Accept': 'application/json',
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'Authorization': `Bearer ${session.accessToken}`
            };
            let res: HttpClientResponse = await client.get(targeturl, headers);
            if (res.message.statusCode === 200) {
                let payload = await res.readBody();
                let dataset: IAbacusConnections = JSON.parse(payload);
                return dataset;
            }
            else {
                vscode.window.showErrorMessage("Abacus system fetch failed with HTTP response code " + res.message.statusCode);
            }
        }
        catch (err) {
            console.log(err);
            vscode.window.showErrorMessage("Abacus system fetch failed with error " + err);
        }
    }
}


