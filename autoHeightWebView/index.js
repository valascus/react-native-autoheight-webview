import React, {useState, useEffect, forwardRef, useCallback} from 'react';
import {debounce} from 'lodash';
import {StyleSheet, Platform} from 'react-native';
import {ViewPropTypes} from 'deprecated-react-native-prop-types';
import PropTypes from 'prop-types';
import {WebView} from 'react-native-webview';
import {
  topic,
  reduceData,
  getWidth,
  isSizeChanged,
  shouldUpdate,
} from './utils';

const AutoHeightWebView = React.memo(
  forwardRef(({
    showsVerticalScrollIndicator = false,
    showsHorizontalScrollIndicator = false,
    originWhitelist = ['*'],
    scalesPageToFit,
    viewportContent,
    ...props
  }, ref) => {
    const platformDefaults = {};
    if (Platform.OS === 'android') {
      platformDefaults.scalesPageToFit = false;
    }
    if (Platform.OS === 'ios') {
      platformDefaults.viewportContent = 'width=device-width';
    }

    const fixProps = {
      showsVerticalScrollIndicator,
      showsHorizontalScrollIndicator,
      originWhitelist,
      ...platformDefaults,
      ...props,
    };

    const {
      style,
      onMessage,
      onSizeUpdated,
      scrollEnabledWithZoomedin,
      scrollEnabled,
    } = fixProps;

    const [size, setSize] = useState({
      height: style && style.height ? style.height : 0,
      width: getWidth(style),
    });

    const handleDelayWebViewHeight = useCallback(
      debounce((eventData) => {
        try {
          const data = JSON.parse(eventData);
          if (data.topic !== topic) {
            return;
          }
          const {height, width, zoomedin} = data;
          !scrollEnabled &&
            scrollEnabledWithZoomedin &&
            setScrollable(!!zoomedin);
          const {height: previousHeight, width: previousWidth} = size;
          isSizeChanged({height, previousHeight, width, previousWidth}) &&
            setSize({
              height,
              width,
            });
        } catch (error) {
          
        }
      }, 1000),
      [],
    );

    const [scrollable, setScrollable] = useState(false);
    const handleMessage = (event) => {
      if (event.nativeEvent && event.nativeEvent.data) {
        handleDelayWebViewHeight(event.nativeEvent.data);
      } else {
        onMessage && onMessage(event);
      }
    };

    const currentScrollEnabled =
      scrollEnabled === false && scrollEnabledWithZoomedin
        ? scrollable
        : scrollEnabled;

    const {currentSource, script} = reduceData(fixProps);
    const {width, height} = size;
    useEffect(() => {
      onSizeUpdated &&
        onSizeUpdated({
          height,
          width,
        });
    }, [width, height, onSizeUpdated]);

    return React.createElement(WebView, {
      ...fixProps,
      ref,
      onMessage: handleMessage,
      style: [
        styles.webView,
        {
          width,
          height,
        },
        style,
      ],
      injectedJavaScript: script,
      source: currentSource,
      scrollEnabled: currentScrollEnabled,
    });
  }),
  (prevProps, nextProps) => !shouldUpdate({prevProps, nextProps}),
);

AutoHeightWebView.propTypes = {
  onSizeUpdated: PropTypes.func,
  files: PropTypes.arrayOf(
    PropTypes.shape({
      href: PropTypes.string,
      type: PropTypes.string,
      rel: PropTypes.string,
    }),
  ),
  style: ViewPropTypes.style,
  customScript: PropTypes.string,
  customStyle: PropTypes.string,
  viewportContent: PropTypes.string,
  scrollEnabledWithZoomedin: PropTypes.bool,
  // webview props
  originWhitelist: PropTypes.arrayOf(PropTypes.string),
  onMessage: PropTypes.func,
  scalesPageToFit: PropTypes.bool,
  source: PropTypes.object,
};

const styles = StyleSheet.create({
  webView: {
    backgroundColor: 'transparent',
  },
});

export default AutoHeightWebView;