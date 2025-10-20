/**
 * vFlow Version Configuration
 *
 * Version format: v1.XX
 * XX = Sequential commit number (01, 02, 03, etc.)
 */

export const VERSION = 'v1.02';
export const APP_NAME = 'vFlow';
export const AUTHOR = 'aiChemist';

export const getVersionString = () => `${APP_NAME} ${VERSION}`;
export const getFullVersionString = () => `${APP_NAME} ${VERSION} | ${AUTHOR}`;
