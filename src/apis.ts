import { noop } from 'lodash';
import type { ParcelConfigObject } from 'single-spa';
import { mountRootParcel, registerApplication, start as startSingleSpa } from 'single-spa';
import type { ObjectType } from './interfaces';
import type { FrameworkConfiguration, FrameworkLifeCycles, LoadableApp, MicroApp, RegistrableApp } from './interfaces';
import type { ParcelConfigObjectGetter } from './loader';
import { loadApp } from './loader';
import { doPrefetchStrategy } from './prefetch';
import { Deferred, getContainer, getXPathForElement, toArray } from './utils';

let microApps: Array<RegistrableApp<Record<string, unknown>>> = [];

// eslint-disable-next-line import/no-mutable-exports
export let frameworkConfiguration: FrameworkConfiguration = {};

let started = false;
const defaultUrlRerouteOnly = true;

const frameworkStartedDefer = new Deferred<void>();

export function registerMicroApps<T extends ObjectType>(
  apps: Array<RegistrableApp<T>>, // 需要注册的子应用
  lifeCycles?: FrameworkLifeCycles<T>, // qiankun自己的声明周期
) {
  debugger
  // Each app only needs to be registered once
  // 找到未注册的应用
  const unregisteredApps = apps.filter((app) => !microApps.some((registeredApp) => registeredApp.name === app.name));

  microApps = [...microApps, ...unregisteredApps];

  unregisteredApps.forEach((app) => {
    const { name, activeRule, loader = noop, props, ...appConfig } = app;

    registerApplication({
      name,
      app: async () => {
        debugger
        // 1.执行加载动画
        loader(true);
        await frameworkStartedDefer.promise;

        // 2.加载子应用的资源
        const { mount, ...otherMicroAppConfigs } = (
          await loadApp({ name, props, ...appConfig }, frameworkConfiguration, lifeCycles)
        )();
        debugger

        // 3.返回single-spa需要的应用生命周期，由single-spa去调用
        // qiankun只是负责拉取资源获得子应用的生命周期方法
        return {
          mount: [async () => loader(true), ...toArray(mount), async () => loader(false)],
          ...otherMicroAppConfigs,
        };
      },
      activeWhen: activeRule,
      customProps: props,
    });
  });
}

const appConfigPromiseGetterMap = new Map<string, Promise<ParcelConfigObjectGetter>>();

export function loadMicroApp<T extends ObjectType>(
  app: LoadableApp<T>,
  configuration?: FrameworkConfiguration,
  lifeCycles?: FrameworkLifeCycles<T>,
): MicroApp {
  debugger
  const { props, name } = app;

  const getContainerXpath = (container: string | HTMLElement): string | void => {
    const containerElement = getContainer(container);
    if (containerElement) {
      return getXPathForElement(containerElement, document);
    }

    return undefined;
  };

  const wrapParcelConfigForRemount = (config: ParcelConfigObject): ParcelConfigObject => {
    return {
      ...config,
      // empty bootstrap hook which should not run twice while it calling from cached micro app
      bootstrap: () => Promise.resolve(),
    };
  };

  /**
   * using name + container xpath as the micro app instance id,
   * it means if you rendering a micro app to a dom which have been rendered before,
   * the micro app would not load and evaluate its lifecycles again
   */
  const memorizedLoadingFn = async (): Promise<ParcelConfigObject> => {
    const userConfiguration = configuration ?? { ...frameworkConfiguration, singular: false };
    const { $$cacheLifecycleByAppName } = userConfiguration;
    const container = 'container' in app ? app.container : undefined;

    if (container) {
      // using appName as cache for internal experimental scenario
      if ($$cacheLifecycleByAppName) {
        const parcelConfigGetterPromise = appConfigPromiseGetterMap.get(name);
        if (parcelConfigGetterPromise) return wrapParcelConfigForRemount((await parcelConfigGetterPromise)(container));
      }

      const xpath = getContainerXpath(container);
      if (xpath) {
        const parcelConfigGetterPromise = appConfigPromiseGetterMap.get(`${name}-${xpath}`);
        if (parcelConfigGetterPromise) return wrapParcelConfigForRemount((await parcelConfigGetterPromise)(container));
      }
    }

    const parcelConfigObjectGetterPromise = loadApp(app, userConfiguration, lifeCycles);

    if (container) {
      if ($$cacheLifecycleByAppName) {
        appConfigPromiseGetterMap.set(name, parcelConfigObjectGetterPromise);
      } else {
        const xpath = getContainerXpath(container);
        if (xpath) appConfigPromiseGetterMap.set(`${name}-${xpath}`, parcelConfigObjectGetterPromise);
      }
    }

    return (await parcelConfigObjectGetterPromise)(container);
  };

  if (!started) {
    // We need to invoke start method of single-spa as the popstate event should be dispatched while the main app calling pushState/replaceState automatically,
    // but in single-spa it will check the start status before it dispatch popstate
    // see https://github.com/single-spa/single-spa/blob/f28b5963be1484583a072c8145ac0b5a28d91235/src/navigation/navigation-events.js#L101
    // ref https://github.com/umijs/qiankun/pull/1071
    startSingleSpa({ urlRerouteOnly: frameworkConfiguration.urlRerouteOnly ?? defaultUrlRerouteOnly });
  }

  return mountRootParcel(memorizedLoadingFn, { domElement: document.createElement('div'), ...props });
}

export function start(opts: FrameworkConfiguration = {}) {
  debugger
  frameworkConfiguration = { prefetch: true, singular: true, sandbox: true, ...opts };
  const {
    prefetch,
    sandbox,
    singular,
    urlRerouteOnly = defaultUrlRerouteOnly,
    ...importEntryOpts
  } = frameworkConfiguration;

  // 预加载
  if (prefetch) {
    doPrefetchStrategy(microApps, prefetch, importEntryOpts);
  }

  if (sandbox) {
    if (!window.Proxy) {
      console.warn('[qiankun] Miss window.Proxy, proxySandbox will degenerate into snapshotSandbox');
      frameworkConfiguration.sandbox = typeof sandbox === 'object' ? { ...sandbox, loose: true } : { loose: true };
      if (!singular) {
        console.warn(
          '[qiankun] Setting singular as false may cause unexpected behavior while your browser not support window.Proxy',
        );
      }
    }
  }

  // 调用single-spa的start方法
  // single内部将会运行当前匹配的应用，也就是执行registerApplication参数的app方法
  startSingleSpa({ urlRerouteOnly });
  started = true;

  frameworkStartedDefer.resolve();
}
