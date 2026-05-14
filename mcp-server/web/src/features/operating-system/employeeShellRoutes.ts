import type { EmployeeShellBootstrap } from './contracts';

function parseTarget(target: string) {
  return new URL(target, 'http://employee.prism.local');
}

function collectAllowedTargets(bootstrap: EmployeeShellBootstrap) {
  return [
    ...bootstrap.homeModules.map((module) => module.to),
    ...bootstrap.navGroups.flatMap((group) => group.items.map((item) => item.to)),
  ];
}

export function getEmployeeShellHomePath(profileId: string) {
  const params = new URLSearchParams();
  params.set('profile', profileId);
  return `/employee?${params.toString()}`;
}

export function toEmployeeShellPath(target: string, profileId: string) {
  const url = parseTarget(target);
  const params = new URLSearchParams(url.search);
  params.set('profile', profileId);

  const search = params.toString();
  return `/employee${url.pathname}${search ? `?${search}` : ''}`;
}

export function getAppRouteFromEmployeePath(pathname: string) {
  const suffix = pathname.replace(/^\/employee/, '');
  return suffix.length > 0 ? suffix : '/';
}

export function isEmployeeRouteAllowed(bootstrap: EmployeeShellBootstrap, employeePathname: string) {
  if (employeePathname === '/employee' || employeePathname === '/employee/') {
    return true;
  }

  const appRoute = getAppRouteFromEmployeePath(employeePathname);
  const allowedPathnames = new Set(
    collectAllowedTargets(bootstrap).map((target) => parseTarget(target).pathname),
  );

  return allowedPathnames.has(appRoute);
}
