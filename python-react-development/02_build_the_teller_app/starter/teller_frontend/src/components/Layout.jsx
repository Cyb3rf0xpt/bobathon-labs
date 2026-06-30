import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, NavLink } from 'react-router-dom';
import {
  Header,
  HeaderContainer,
  HeaderMenuButton,
  HeaderName,
  HeaderGlobalBar,
  HeaderGlobalAction,
  SideNav,
  SideNavItems,
  SideNavLink,
  SkipToContent,
  InlineNotification,
} from '@carbon/react';
import { Logout, Dashboard, ArrowsHorizontal, Finance } from '@carbon/icons-react';
import { useAuth } from '../auth/AuthContext';
import { checkBackendStatus } from '../services/api';

const Layout = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const check = async () => setIsOnline(await checkBackendStatus());
    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <HeaderContainer
      render={({ isSideNavExpanded, onClickSideNavExpand }) => (
        <>
          <Header aria-label="GFM Bank Teller Portal">
            <SkipToContent />
            <HeaderMenuButton
              aria-label={isSideNavExpanded ? 'Close menu' : 'Open menu'}
              onClick={onClickSideNavExpand}
              isActive={isSideNavExpanded}
            />
            <HeaderName href="/dashboard" prefix="GFM Bank">
              Teller Portal
            </HeaderName>

            <HeaderGlobalBar>
              {/* Online / offline indicator */}
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  fontSize: '0.875rem',
                  color: 'var(--cds-text-on-color)',
                  padding: '0 1rem',
                  whiteSpace: 'nowrap',
                }}
                aria-live="polite"
                aria-label={isOnline ? 'Backend online' : 'Backend offline'}
              >
                <span
                  style={{
                    width: '0.625rem',
                    height: '0.625rem',
                    borderRadius: '50%',
                    backgroundColor: isOnline
                      ? 'var(--cds-support-success)'
                      : 'var(--cds-support-error)',
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
                {isOnline ? 'Online' : 'Offline'}
              </span>

              <HeaderGlobalAction
                aria-label="Log out"
                onClick={handleLogout}
                tooltipAlignment="end"
              >
                <Logout size={20} />
              </HeaderGlobalAction>
            </HeaderGlobalBar>

            <SideNav
              aria-label="Side navigation"
              expanded={isSideNavExpanded}
              isPersistent={false}
            >
              <SideNavItems>
                <SideNavLink
                  as={NavLink}
                  to="/dashboard"
                  renderIcon={Dashboard}
                  large
                >
                  Dashboard
                </SideNavLink>
                <SideNavLink
                  as={NavLink}
                  to="/transfer"
                  renderIcon={ArrowsHorizontal}
                  large
                >
                  Transfer
                </SideNavLink>
                <SideNavLink
                  as={NavLink}
                  to="/overdraft"
                  renderIcon={Finance}
                  large
                >
                  Overdraft Request
                </SideNavLink>
              </SideNavItems>
            </SideNav>
          </Header>

          {/* Offline banner below header */}
          {!isOnline && (
            <div style={{ marginTop: '3rem' }}>
              <InlineNotification
                kind="error"
                title="Backend offline"
                subtitle="The core banking backend is unreachable. Please wait and try again."
                hideCloseButton
                lowContrast={false}
              />
            </div>
          )}

          <main
            id="main-content"
            style={{
              marginTop: '3rem',
              padding: '2rem',
              minHeight: 'calc(100vh - 3rem)',
            }}
          >
            <Outlet context={{ isOnline }} />
          </main>
        </>
      )}
    />
  );
};

export default Layout;
