import React, { useState, useEffect, createContext, useContext, ReactNode, isValidElement, cloneElement, Children } from 'react';

// --- Router Shim for Missing react-router-dom ---
// This file replaces react-router-dom functionality using a custom HashRouter implementation
// to resolve "Module 'react-router-dom' has no exported member" errors.

interface LocationState {
    pathname: string;
    search: string;
}

interface RouterContextType {
    location: LocationState;
    params: Record<string, string>;
}

const RouterContext = createContext<RouterContextType>({
    location: { pathname: '/', search: '' },
    params: {}
});

export const HashRouter = ({ children }: { children?: ReactNode }) => {
    const getHashLoc = () => {
        const hash = window.location.hash.slice(1); // remove #
        const [pathname, search] = hash.split('?');
        return {
            pathname: pathname || '/',
            search: search ? '?' + search : ''
        };
    };

    const [location, setLocation] = useState<LocationState>(getHashLoc());

    useEffect(() => {
        const handleHashChange = () => setLocation(getHashLoc());
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    return React.createElement(RouterContext.Provider, { value: { location, params: {} } }, children);
};

export const Routes = ({ children }: { children?: ReactNode }) => {
    const { location } = useContext(RouterContext);
    let match: ReactNode = null;

    Children.forEach(children, (child) => {
        if (match || !isValidElement(child)) return;
        
        const path = (child.props as any).path;
        if (path === '*') {
            match = child;
            return;
        }

        // Convert path pattern to regex for matching
        const regexPath = '^' + path.replace(/:[a-zA-Z0-9_]+/g, '([^/]+)') + '$';
        const regex = new RegExp(regexPath);
        const m = location.pathname.match(regex);

        if (m) {
            match = cloneElement(child as React.ReactElement<any>, { computedMatch: m });
        }
    });

    return match || null;
};

export const Route = ({ element, computedMatch, path }: any) => {
    const { location } = useContext(RouterContext);
    const params: Record<string, string> = {};

    if (computedMatch && path) {
        const paramNames = (path.match(/:[a-zA-Z0-9_]+/g) || []).map((p: string) => p.slice(1));
        const paramValues = computedMatch.slice(1);
        paramNames.forEach((name: string, i: number) => {
            params[name] = paramValues[i];
        });
    }

    return React.createElement(RouterContext.Provider, { value: { location, params } }, element);
};

export const Link = ({ to, children, className, onClick, ...props }: any) => {
    const handleClick = (e: React.MouseEvent) => {
        if (onClick) onClick(e);
    };
    return React.createElement('a', {
        href: `#${to}`,
        className: className,
        onClick: handleClick,
        ...props
    }, children);
};

export const Navigate = ({ to, replace }: { to: string, replace?: boolean }) => {
    useEffect(() => {
        if (replace) window.location.replace('#' + to);
        else window.location.hash = to;
    }, [to, replace]);
    return null;
};

export const useNavigate = () => {
    return (to: string | number, options?: { replace?: boolean }) => {
        if (typeof to === 'number') {
            window.history.go(to);
        } else {
            if (options?.replace) window.location.replace('#' + to);
            else window.location.hash = to;
        }
    };
};

export const useLocation = () => useContext(RouterContext).location;

// Allow generic type argument to match react-router-dom signature (e.g. useParams<{ id: string }>())
export const useParams = <T = Record<string, string | undefined>>() => {
    return useContext(RouterContext).params as unknown as T;
};

export const useSearchParams = () => {
    const { search } = useLocation();
    const [searchParams, setSearchParams] = useState(new URLSearchParams(search));

    useEffect(() => {
        setSearchParams(new URLSearchParams(search));
    }, [search]);

    const setParams = (newParams: Record<string, string>) => {
        const params = new URLSearchParams(newParams);
        const hash = window.location.hash.split('?')[0];
        window.location.hash = hash + '?' + params.toString();
    };

    return [searchParams, setParams] as const;
};