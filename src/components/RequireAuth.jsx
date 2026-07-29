import { Navigate, useLocation } from 'react-router-dom';

/**
 * Protegge le rotte che richiedono un utente autenticato.
 *
 * Senza questo guard le pagine private venivano montate comunque e fallivano in
 * modo confuso: /my-trips mostrava due toast di errore sovrapposti e una lista
 * vuota (come se l'utente non avesse viaggi), /market restava bianca, /manager
 * rimbalzava su /my-trips che era a sua volta rotta.
 *
 * La rotta di partenza viene passata ad /auth in `location.state.redirectTo`,
 * cosi' dopo il login si torna dove si stava andando.
 */
const RequireAuth = ({ children }) => {
    const location = useLocation();
    const isAuthenticated = Boolean(localStorage.getItem('token'));

    if (!isAuthenticated) {
        return (
            <Navigate
                to="/auth"
                replace
                state={{ redirectTo: location.pathname + location.search }}
            />
        );
    }

    return children;
};

export default RequireAuth;
