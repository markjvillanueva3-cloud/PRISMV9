var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/react/cjs/react.development.js
var require_react_development = __commonJS({
  "node_modules/react/cjs/react.development.js"(exports, module) {
    "use strict";
    (function() {
      function defineDeprecationWarning(methodName, info) {
        Object.defineProperty(Component4.prototype, methodName, {
          get: function() {
            console.warn(
              "%s(...) is deprecated in plain JavaScript React classes. %s",
              info[0],
              info[1]
            );
          }
        });
      }
      function getIteratorFn(maybeIterable) {
        if (null === maybeIterable || "object" !== typeof maybeIterable)
          return null;
        maybeIterable = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable["@@iterator"];
        return "function" === typeof maybeIterable ? maybeIterable : null;
      }
      function warnNoop(publicInstance, callerName) {
        publicInstance = (publicInstance = publicInstance.constructor) && (publicInstance.displayName || publicInstance.name) || "ReactClass";
        var warningKey = publicInstance + "." + callerName;
        didWarnStateUpdateForUnmountedComponent[warningKey] || (console.error(
          "Can't call %s on a component that is not yet mounted. This is a no-op, but it might indicate a bug in your application. Instead, assign to `this.state` directly or define a `state = {};` class property with the desired state in the %s component.",
          callerName,
          publicInstance
        ), didWarnStateUpdateForUnmountedComponent[warningKey] = true);
      }
      function Component4(props, context, updater) {
        this.props = props;
        this.context = context;
        this.refs = emptyObject;
        this.updater = updater || ReactNoopUpdateQueue;
      }
      function ComponentDummy() {
      }
      function PureComponent(props, context, updater) {
        this.props = props;
        this.context = context;
        this.refs = emptyObject;
        this.updater = updater || ReactNoopUpdateQueue;
      }
      function testStringCoercion(value) {
        return "" + value;
      }
      function checkKeyStringCoercion(value) {
        try {
          testStringCoercion(value);
          var JSCompiler_inline_result = false;
        } catch (e) {
          JSCompiler_inline_result = true;
        }
        if (JSCompiler_inline_result) {
          JSCompiler_inline_result = console;
          var JSCompiler_temp_const = JSCompiler_inline_result.error;
          var JSCompiler_inline_result$jscomp$0 = "function" === typeof Symbol && Symbol.toStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
          JSCompiler_temp_const.call(
            JSCompiler_inline_result,
            "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.",
            JSCompiler_inline_result$jscomp$0
          );
          return testStringCoercion(value);
        }
      }
      function getComponentNameFromType(type) {
        if (null == type) return null;
        if ("function" === typeof type)
          return type.$$typeof === REACT_CLIENT_REFERENCE$2 ? null : type.displayName || type.name || null;
        if ("string" === typeof type) return type;
        switch (type) {
          case REACT_FRAGMENT_TYPE:
            return "Fragment";
          case REACT_PORTAL_TYPE:
            return "Portal";
          case REACT_PROFILER_TYPE:
            return "Profiler";
          case REACT_STRICT_MODE_TYPE:
            return "StrictMode";
          case REACT_SUSPENSE_TYPE:
            return "Suspense";
          case REACT_SUSPENSE_LIST_TYPE:
            return "SuspenseList";
        }
        if ("object" === typeof type)
          switch ("number" === typeof type.tag && console.error(
            "Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."
          ), type.$$typeof) {
            case REACT_CONTEXT_TYPE:
              return (type.displayName || "Context") + ".Provider";
            case REACT_CONSUMER_TYPE:
              return (type._context.displayName || "Context") + ".Consumer";
            case REACT_FORWARD_REF_TYPE:
              var innerType = type.render;
              type = type.displayName;
              type || (type = innerType.displayName || innerType.name || "", type = "" !== type ? "ForwardRef(" + type + ")" : "ForwardRef");
              return type;
            case REACT_MEMO_TYPE:
              return innerType = type.displayName || null, null !== innerType ? innerType : getComponentNameFromType(type.type) || "Memo";
            case REACT_LAZY_TYPE:
              innerType = type._payload;
              type = type._init;
              try {
                return getComponentNameFromType(type(innerType));
              } catch (x) {
              }
          }
        return null;
      }
      function isValidElementType(type) {
        return "string" === typeof type || "function" === typeof type || type === REACT_FRAGMENT_TYPE || type === REACT_PROFILER_TYPE || type === REACT_STRICT_MODE_TYPE || type === REACT_SUSPENSE_TYPE || type === REACT_SUSPENSE_LIST_TYPE || type === REACT_OFFSCREEN_TYPE || "object" === typeof type && null !== type && (type.$$typeof === REACT_LAZY_TYPE || type.$$typeof === REACT_MEMO_TYPE || type.$$typeof === REACT_CONTEXT_TYPE || type.$$typeof === REACT_CONSUMER_TYPE || type.$$typeof === REACT_FORWARD_REF_TYPE || type.$$typeof === REACT_CLIENT_REFERENCE$1 || void 0 !== type.getModuleId) ? true : false;
      }
      function disabledLog() {
      }
      function disableLogs() {
        if (0 === disabledDepth) {
          prevLog = console.log;
          prevInfo = console.info;
          prevWarn = console.warn;
          prevError = console.error;
          prevGroup = console.group;
          prevGroupCollapsed = console.groupCollapsed;
          prevGroupEnd = console.groupEnd;
          var props = {
            configurable: true,
            enumerable: true,
            value: disabledLog,
            writable: true
          };
          Object.defineProperties(console, {
            info: props,
            log: props,
            warn: props,
            error: props,
            group: props,
            groupCollapsed: props,
            groupEnd: props
          });
        }
        disabledDepth++;
      }
      function reenableLogs() {
        disabledDepth--;
        if (0 === disabledDepth) {
          var props = { configurable: true, enumerable: true, writable: true };
          Object.defineProperties(console, {
            log: assign({}, props, { value: prevLog }),
            info: assign({}, props, { value: prevInfo }),
            warn: assign({}, props, { value: prevWarn }),
            error: assign({}, props, { value: prevError }),
            group: assign({}, props, { value: prevGroup }),
            groupCollapsed: assign({}, props, { value: prevGroupCollapsed }),
            groupEnd: assign({}, props, { value: prevGroupEnd })
          });
        }
        0 > disabledDepth && console.error(
          "disabledDepth fell below zero. This is a bug in React. Please file an issue."
        );
      }
      function describeBuiltInComponentFrame(name) {
        if (void 0 === prefix)
          try {
            throw Error();
          } catch (x) {
            var match = x.stack.trim().match(/\n( *(at )?)/);
            prefix = match && match[1] || "";
            suffix = -1 < x.stack.indexOf("\n    at") ? " (<anonymous>)" : -1 < x.stack.indexOf("@") ? "@unknown:0:0" : "";
          }
        return "\n" + prefix + name + suffix;
      }
      function describeNativeComponentFrame(fn, construct) {
        if (!fn || reentry) return "";
        var frame = componentFrameCache.get(fn);
        if (void 0 !== frame) return frame;
        reentry = true;
        frame = Error.prepareStackTrace;
        Error.prepareStackTrace = void 0;
        var previousDispatcher = null;
        previousDispatcher = ReactSharedInternals.H;
        ReactSharedInternals.H = null;
        disableLogs();
        try {
          var RunInRootFrame = {
            DetermineComponentFrameRoot: function() {
              try {
                if (construct) {
                  var Fake = function() {
                    throw Error();
                  };
                  Object.defineProperty(Fake.prototype, "props", {
                    set: function() {
                      throw Error();
                    }
                  });
                  if ("object" === typeof Reflect && Reflect.construct) {
                    try {
                      Reflect.construct(Fake, []);
                    } catch (x) {
                      var control = x;
                    }
                    Reflect.construct(fn, [], Fake);
                  } else {
                    try {
                      Fake.call();
                    } catch (x$0) {
                      control = x$0;
                    }
                    fn.call(Fake.prototype);
                  }
                } else {
                  try {
                    throw Error();
                  } catch (x$1) {
                    control = x$1;
                  }
                  (Fake = fn()) && "function" === typeof Fake.catch && Fake.catch(function() {
                  });
                }
              } catch (sample) {
                if (sample && control && "string" === typeof sample.stack)
                  return [sample.stack, control.stack];
              }
              return [null, null];
            }
          };
          RunInRootFrame.DetermineComponentFrameRoot.displayName = "DetermineComponentFrameRoot";
          var namePropDescriptor = Object.getOwnPropertyDescriptor(
            RunInRootFrame.DetermineComponentFrameRoot,
            "name"
          );
          namePropDescriptor && namePropDescriptor.configurable && Object.defineProperty(
            RunInRootFrame.DetermineComponentFrameRoot,
            "name",
            { value: "DetermineComponentFrameRoot" }
          );
          var _RunInRootFrame$Deter = RunInRootFrame.DetermineComponentFrameRoot(), sampleStack = _RunInRootFrame$Deter[0], controlStack = _RunInRootFrame$Deter[1];
          if (sampleStack && controlStack) {
            var sampleLines = sampleStack.split("\n"), controlLines = controlStack.split("\n");
            for (_RunInRootFrame$Deter = namePropDescriptor = 0; namePropDescriptor < sampleLines.length && !sampleLines[namePropDescriptor].includes(
              "DetermineComponentFrameRoot"
            ); )
              namePropDescriptor++;
            for (; _RunInRootFrame$Deter < controlLines.length && !controlLines[_RunInRootFrame$Deter].includes(
              "DetermineComponentFrameRoot"
            ); )
              _RunInRootFrame$Deter++;
            if (namePropDescriptor === sampleLines.length || _RunInRootFrame$Deter === controlLines.length)
              for (namePropDescriptor = sampleLines.length - 1, _RunInRootFrame$Deter = controlLines.length - 1; 1 <= namePropDescriptor && 0 <= _RunInRootFrame$Deter && sampleLines[namePropDescriptor] !== controlLines[_RunInRootFrame$Deter]; )
                _RunInRootFrame$Deter--;
            for (; 1 <= namePropDescriptor && 0 <= _RunInRootFrame$Deter; namePropDescriptor--, _RunInRootFrame$Deter--)
              if (sampleLines[namePropDescriptor] !== controlLines[_RunInRootFrame$Deter]) {
                if (1 !== namePropDescriptor || 1 !== _RunInRootFrame$Deter) {
                  do
                    if (namePropDescriptor--, _RunInRootFrame$Deter--, 0 > _RunInRootFrame$Deter || sampleLines[namePropDescriptor] !== controlLines[_RunInRootFrame$Deter]) {
                      var _frame = "\n" + sampleLines[namePropDescriptor].replace(
                        " at new ",
                        " at "
                      );
                      fn.displayName && _frame.includes("<anonymous>") && (_frame = _frame.replace("<anonymous>", fn.displayName));
                      "function" === typeof fn && componentFrameCache.set(fn, _frame);
                      return _frame;
                    }
                  while (1 <= namePropDescriptor && 0 <= _RunInRootFrame$Deter);
                }
                break;
              }
          }
        } finally {
          reentry = false, ReactSharedInternals.H = previousDispatcher, reenableLogs(), Error.prepareStackTrace = frame;
        }
        sampleLines = (sampleLines = fn ? fn.displayName || fn.name : "") ? describeBuiltInComponentFrame(sampleLines) : "";
        "function" === typeof fn && componentFrameCache.set(fn, sampleLines);
        return sampleLines;
      }
      function describeUnknownElementTypeFrameInDEV(type) {
        if (null == type) return "";
        if ("function" === typeof type) {
          var prototype = type.prototype;
          return describeNativeComponentFrame(
            type,
            !(!prototype || !prototype.isReactComponent)
          );
        }
        if ("string" === typeof type) return describeBuiltInComponentFrame(type);
        switch (type) {
          case REACT_SUSPENSE_TYPE:
            return describeBuiltInComponentFrame("Suspense");
          case REACT_SUSPENSE_LIST_TYPE:
            return describeBuiltInComponentFrame("SuspenseList");
        }
        if ("object" === typeof type)
          switch (type.$$typeof) {
            case REACT_FORWARD_REF_TYPE:
              return type = describeNativeComponentFrame(type.render, false), type;
            case REACT_MEMO_TYPE:
              return describeUnknownElementTypeFrameInDEV(type.type);
            case REACT_LAZY_TYPE:
              prototype = type._payload;
              type = type._init;
              try {
                return describeUnknownElementTypeFrameInDEV(type(prototype));
              } catch (x) {
              }
          }
        return "";
      }
      function getOwner() {
        var dispatcher = ReactSharedInternals.A;
        return null === dispatcher ? null : dispatcher.getOwner();
      }
      function hasValidKey(config) {
        if (hasOwnProperty.call(config, "key")) {
          var getter = Object.getOwnPropertyDescriptor(config, "key").get;
          if (getter && getter.isReactWarning) return false;
        }
        return void 0 !== config.key;
      }
      function defineKeyPropWarningGetter(props, displayName) {
        function warnAboutAccessingKey() {
          specialPropKeyWarningShown || (specialPropKeyWarningShown = true, console.error(
            "%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://react.dev/link/special-props)",
            displayName
          ));
        }
        warnAboutAccessingKey.isReactWarning = true;
        Object.defineProperty(props, "key", {
          get: warnAboutAccessingKey,
          configurable: true
        });
      }
      function elementRefGetterWithDeprecationWarning() {
        var componentName = getComponentNameFromType(this.type);
        didWarnAboutElementRef[componentName] || (didWarnAboutElementRef[componentName] = true, console.error(
          "Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release."
        ));
        componentName = this.props.ref;
        return void 0 !== componentName ? componentName : null;
      }
      function ReactElement(type, key, self, source, owner, props) {
        self = props.ref;
        type = {
          $$typeof: REACT_ELEMENT_TYPE,
          type,
          key,
          props,
          _owner: owner
        };
        null !== (void 0 !== self ? self : null) ? Object.defineProperty(type, "ref", {
          enumerable: false,
          get: elementRefGetterWithDeprecationWarning
        }) : Object.defineProperty(type, "ref", { enumerable: false, value: null });
        type._store = {};
        Object.defineProperty(type._store, "validated", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: 0
        });
        Object.defineProperty(type, "_debugInfo", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: null
        });
        Object.freeze && (Object.freeze(type.props), Object.freeze(type));
        return type;
      }
      function cloneAndReplaceKey(oldElement, newKey) {
        newKey = ReactElement(
          oldElement.type,
          newKey,
          void 0,
          void 0,
          oldElement._owner,
          oldElement.props
        );
        newKey._store.validated = oldElement._store.validated;
        return newKey;
      }
      function validateChildKeys(node, parentType) {
        if ("object" === typeof node && node && node.$$typeof !== REACT_CLIENT_REFERENCE) {
          if (isArrayImpl(node))
            for (var i = 0; i < node.length; i++) {
              var child = node[i];
              isValidElement2(child) && validateExplicitKey(child, parentType);
            }
          else if (isValidElement2(node))
            node._store && (node._store.validated = 1);
          else if (i = getIteratorFn(node), "function" === typeof i && i !== node.entries && (i = i.call(node), i !== node))
            for (; !(node = i.next()).done; )
              isValidElement2(node.value) && validateExplicitKey(node.value, parentType);
        }
      }
      function isValidElement2(object) {
        return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
      }
      function validateExplicitKey(element, parentType) {
        if (element._store && !element._store.validated && null == element.key && (element._store.validated = 1, parentType = getCurrentComponentErrorInfo(parentType), !ownerHasKeyUseWarning[parentType])) {
          ownerHasKeyUseWarning[parentType] = true;
          var childOwner = "";
          element && null != element._owner && element._owner !== getOwner() && (childOwner = null, "number" === typeof element._owner.tag ? childOwner = getComponentNameFromType(element._owner.type) : "string" === typeof element._owner.name && (childOwner = element._owner.name), childOwner = " It was passed a child from " + childOwner + ".");
          var prevGetCurrentStack = ReactSharedInternals.getCurrentStack;
          ReactSharedInternals.getCurrentStack = function() {
            var stack = describeUnknownElementTypeFrameInDEV(element.type);
            prevGetCurrentStack && (stack += prevGetCurrentStack() || "");
            return stack;
          };
          console.error(
            'Each child in a list should have a unique "key" prop.%s%s See https://react.dev/link/warning-keys for more information.',
            parentType,
            childOwner
          );
          ReactSharedInternals.getCurrentStack = prevGetCurrentStack;
        }
      }
      function getCurrentComponentErrorInfo(parentType) {
        var info = "", owner = getOwner();
        owner && (owner = getComponentNameFromType(owner.type)) && (info = "\n\nCheck the render method of `" + owner + "`.");
        info || (parentType = getComponentNameFromType(parentType)) && (info = "\n\nCheck the top-level render call using <" + parentType + ">.");
        return info;
      }
      function escape(key) {
        var escaperLookup = { "=": "=0", ":": "=2" };
        return "$" + key.replace(/[=:]/g, function(match) {
          return escaperLookup[match];
        });
      }
      function getElementKey(element, index) {
        return "object" === typeof element && null !== element && null != element.key ? (checkKeyStringCoercion(element.key), escape("" + element.key)) : index.toString(36);
      }
      function noop$1() {
      }
      function resolveThenable(thenable) {
        switch (thenable.status) {
          case "fulfilled":
            return thenable.value;
          case "rejected":
            throw thenable.reason;
          default:
            switch ("string" === typeof thenable.status ? thenable.then(noop$1, noop$1) : (thenable.status = "pending", thenable.then(
              function(fulfilledValue) {
                "pending" === thenable.status && (thenable.status = "fulfilled", thenable.value = fulfilledValue);
              },
              function(error) {
                "pending" === thenable.status && (thenable.status = "rejected", thenable.reason = error);
              }
            )), thenable.status) {
              case "fulfilled":
                return thenable.value;
              case "rejected":
                throw thenable.reason;
            }
        }
        throw thenable;
      }
      function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
        var type = typeof children;
        if ("undefined" === type || "boolean" === type) children = null;
        var invokeCallback = false;
        if (null === children) invokeCallback = true;
        else
          switch (type) {
            case "bigint":
            case "string":
            case "number":
              invokeCallback = true;
              break;
            case "object":
              switch (children.$$typeof) {
                case REACT_ELEMENT_TYPE:
                case REACT_PORTAL_TYPE:
                  invokeCallback = true;
                  break;
                case REACT_LAZY_TYPE:
                  return invokeCallback = children._init, mapIntoArray(
                    invokeCallback(children._payload),
                    array,
                    escapedPrefix,
                    nameSoFar,
                    callback
                  );
              }
          }
        if (invokeCallback) {
          invokeCallback = children;
          callback = callback(invokeCallback);
          var childKey = "" === nameSoFar ? "." + getElementKey(invokeCallback, 0) : nameSoFar;
          isArrayImpl(callback) ? (escapedPrefix = "", null != childKey && (escapedPrefix = childKey.replace(userProvidedKeyEscapeRegex, "$&/") + "/"), mapIntoArray(callback, array, escapedPrefix, "", function(c) {
            return c;
          })) : null != callback && (isValidElement2(callback) && (null != callback.key && (invokeCallback && invokeCallback.key === callback.key || checkKeyStringCoercion(callback.key)), escapedPrefix = cloneAndReplaceKey(
            callback,
            escapedPrefix + (null == callback.key || invokeCallback && invokeCallback.key === callback.key ? "" : ("" + callback.key).replace(
              userProvidedKeyEscapeRegex,
              "$&/"
            ) + "/") + childKey
          ), "" !== nameSoFar && null != invokeCallback && isValidElement2(invokeCallback) && null == invokeCallback.key && invokeCallback._store && !invokeCallback._store.validated && (escapedPrefix._store.validated = 2), callback = escapedPrefix), array.push(callback));
          return 1;
        }
        invokeCallback = 0;
        childKey = "" === nameSoFar ? "." : nameSoFar + ":";
        if (isArrayImpl(children))
          for (var i = 0; i < children.length; i++)
            nameSoFar = children[i], type = childKey + getElementKey(nameSoFar, i), invokeCallback += mapIntoArray(
              nameSoFar,
              array,
              escapedPrefix,
              type,
              callback
            );
        else if (i = getIteratorFn(children), "function" === typeof i)
          for (i === children.entries && (didWarnAboutMaps || console.warn(
            "Using Maps as children is not supported. Use an array of keyed ReactElements instead."
          ), didWarnAboutMaps = true), children = i.call(children), i = 0; !(nameSoFar = children.next()).done; )
            nameSoFar = nameSoFar.value, type = childKey + getElementKey(nameSoFar, i++), invokeCallback += mapIntoArray(
              nameSoFar,
              array,
              escapedPrefix,
              type,
              callback
            );
        else if ("object" === type) {
          if ("function" === typeof children.then)
            return mapIntoArray(
              resolveThenable(children),
              array,
              escapedPrefix,
              nameSoFar,
              callback
            );
          array = String(children);
          throw Error(
            "Objects are not valid as a React child (found: " + ("[object Object]" === array ? "object with keys {" + Object.keys(children).join(", ") + "}" : array) + "). If you meant to render a collection of children, use an array instead."
          );
        }
        return invokeCallback;
      }
      function mapChildren(children, func, context) {
        if (null == children) return children;
        var result = [], count = 0;
        mapIntoArray(children, result, "", "", function(child) {
          return func.call(context, child, count++);
        });
        return result;
      }
      function lazyInitializer(payload) {
        if (-1 === payload._status) {
          var ctor = payload._result;
          ctor = ctor();
          ctor.then(
            function(moduleObject) {
              if (0 === payload._status || -1 === payload._status)
                payload._status = 1, payload._result = moduleObject;
            },
            function(error) {
              if (0 === payload._status || -1 === payload._status)
                payload._status = 2, payload._result = error;
            }
          );
          -1 === payload._status && (payload._status = 0, payload._result = ctor);
        }
        if (1 === payload._status)
          return ctor = payload._result, void 0 === ctor && console.error(
            "lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))\n\nDid you accidentally put curly braces around the import?",
            ctor
          ), "default" in ctor || console.error(
            "lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))",
            ctor
          ), ctor.default;
        throw payload._result;
      }
      function resolveDispatcher() {
        var dispatcher = ReactSharedInternals.H;
        null === dispatcher && console.error(
          "Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:\n1. You might have mismatching versions of React and the renderer (such as React DOM)\n2. You might be breaking the Rules of Hooks\n3. You might have more than one copy of React in the same app\nSee https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem."
        );
        return dispatcher;
      }
      function noop() {
      }
      function enqueueTask(task) {
        if (null === enqueueTaskImpl)
          try {
            var requireString = ("require" + Math.random()).slice(0, 7);
            enqueueTaskImpl = (module && module[requireString]).call(
              module,
              "timers"
            ).setImmediate;
          } catch (_err) {
            enqueueTaskImpl = function(callback) {
              false === didWarnAboutMessageChannel && (didWarnAboutMessageChannel = true, "undefined" === typeof MessageChannel && console.error(
                "This browser does not have a MessageChannel implementation, so enqueuing tasks via await act(async () => ...) will fail. Please file an issue at https://github.com/facebook/react/issues if you encounter this warning."
              ));
              var channel = new MessageChannel();
              channel.port1.onmessage = callback;
              channel.port2.postMessage(void 0);
            };
          }
        return enqueueTaskImpl(task);
      }
      function aggregateErrors(errors) {
        return 1 < errors.length && "function" === typeof AggregateError ? new AggregateError(errors) : errors[0];
      }
      function popActScope(prevActQueue, prevActScopeDepth) {
        prevActScopeDepth !== actScopeDepth - 1 && console.error(
          "You seem to have overlapping act() calls, this is not supported. Be sure to await previous act() calls before making a new one. "
        );
        actScopeDepth = prevActScopeDepth;
      }
      function recursivelyFlushAsyncActWork(returnValue, resolve, reject) {
        var queue = ReactSharedInternals.actQueue;
        if (null !== queue)
          if (0 !== queue.length)
            try {
              flushActQueue(queue);
              enqueueTask(function() {
                return recursivelyFlushAsyncActWork(returnValue, resolve, reject);
              });
              return;
            } catch (error) {
              ReactSharedInternals.thrownErrors.push(error);
            }
          else ReactSharedInternals.actQueue = null;
        0 < ReactSharedInternals.thrownErrors.length ? (queue = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, reject(queue)) : resolve(returnValue);
      }
      function flushActQueue(queue) {
        if (!isFlushing) {
          isFlushing = true;
          var i = 0;
          try {
            for (; i < queue.length; i++) {
              var callback = queue[i];
              do {
                ReactSharedInternals.didUsePromise = false;
                var continuation = callback(false);
                if (null !== continuation) {
                  if (ReactSharedInternals.didUsePromise) {
                    queue[i] = callback;
                    queue.splice(0, i);
                    return;
                  }
                  callback = continuation;
                } else break;
              } while (1);
            }
            queue.length = 0;
          } catch (error) {
            queue.splice(0, i + 1), ReactSharedInternals.thrownErrors.push(error);
          } finally {
            isFlushing = false;
          }
        }
      }
      "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(Error());
      var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = Symbol.for("react.profiler");
      Symbol.for("react.provider");
      var REACT_CONSUMER_TYPE = Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"), REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"), REACT_MEMO_TYPE = Symbol.for("react.memo"), REACT_LAZY_TYPE = Symbol.for("react.lazy"), REACT_OFFSCREEN_TYPE = Symbol.for("react.offscreen"), MAYBE_ITERATOR_SYMBOL = Symbol.iterator, didWarnStateUpdateForUnmountedComponent = {}, ReactNoopUpdateQueue = {
        isMounted: function() {
          return false;
        },
        enqueueForceUpdate: function(publicInstance) {
          warnNoop(publicInstance, "forceUpdate");
        },
        enqueueReplaceState: function(publicInstance) {
          warnNoop(publicInstance, "replaceState");
        },
        enqueueSetState: function(publicInstance) {
          warnNoop(publicInstance, "setState");
        }
      }, assign = Object.assign, emptyObject = {};
      Object.freeze(emptyObject);
      Component4.prototype.isReactComponent = {};
      Component4.prototype.setState = function(partialState, callback) {
        if ("object" !== typeof partialState && "function" !== typeof partialState && null != partialState)
          throw Error(
            "takes an object of state variables to update or a function which returns an object of state variables."
          );
        this.updater.enqueueSetState(this, partialState, callback, "setState");
      };
      Component4.prototype.forceUpdate = function(callback) {
        this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
      };
      var deprecatedAPIs = {
        isMounted: [
          "isMounted",
          "Instead, make sure to clean up subscriptions and pending requests in componentWillUnmount to prevent memory leaks."
        ],
        replaceState: [
          "replaceState",
          "Refactor your code to use setState instead (see https://github.com/facebook/react/issues/3236)."
        ]
      }, fnName;
      for (fnName in deprecatedAPIs)
        deprecatedAPIs.hasOwnProperty(fnName) && defineDeprecationWarning(fnName, deprecatedAPIs[fnName]);
      ComponentDummy.prototype = Component4.prototype;
      deprecatedAPIs = PureComponent.prototype = new ComponentDummy();
      deprecatedAPIs.constructor = PureComponent;
      assign(deprecatedAPIs, Component4.prototype);
      deprecatedAPIs.isPureReactComponent = true;
      var isArrayImpl = Array.isArray, REACT_CLIENT_REFERENCE$2 = Symbol.for("react.client.reference"), ReactSharedInternals = {
        H: null,
        A: null,
        T: null,
        S: null,
        actQueue: null,
        isBatchingLegacy: false,
        didScheduleLegacyUpdate: false,
        didUsePromise: false,
        thrownErrors: [],
        getCurrentStack: null
      }, hasOwnProperty = Object.prototype.hasOwnProperty, REACT_CLIENT_REFERENCE$1 = Symbol.for("react.client.reference"), disabledDepth = 0, prevLog, prevInfo, prevWarn, prevError, prevGroup, prevGroupCollapsed, prevGroupEnd;
      disabledLog.__reactDisabledLog = true;
      var prefix, suffix, reentry = false;
      var componentFrameCache = new ("function" === typeof WeakMap ? WeakMap : Map)();
      var REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference"), specialPropKeyWarningShown, didWarnAboutOldJSXRuntime;
      var didWarnAboutElementRef = {};
      var ownerHasKeyUseWarning = {}, didWarnAboutMaps = false, userProvidedKeyEscapeRegex = /\/+/g, reportGlobalError = "function" === typeof reportError ? reportError : function(error) {
        if ("object" === typeof window && "function" === typeof window.ErrorEvent) {
          var event = new window.ErrorEvent("error", {
            bubbles: true,
            cancelable: true,
            message: "object" === typeof error && null !== error && "string" === typeof error.message ? String(error.message) : String(error),
            error
          });
          if (!window.dispatchEvent(event)) return;
        } else if ("object" === typeof process && "function" === typeof process.emit) {
          process.emit("uncaughtException", error);
          return;
        }
        console.error(error);
      }, didWarnAboutMessageChannel = false, enqueueTaskImpl = null, actScopeDepth = 0, didWarnNoAwaitAct = false, isFlushing = false, queueSeveralMicrotasks = "function" === typeof queueMicrotask ? function(callback) {
        queueMicrotask(function() {
          return queueMicrotask(callback);
        });
      } : enqueueTask;
      exports.Children = {
        map: mapChildren,
        forEach: function(children, forEachFunc, forEachContext) {
          mapChildren(
            children,
            function() {
              forEachFunc.apply(this, arguments);
            },
            forEachContext
          );
        },
        count: function(children) {
          var n = 0;
          mapChildren(children, function() {
            n++;
          });
          return n;
        },
        toArray: function(children) {
          return mapChildren(children, function(child) {
            return child;
          }) || [];
        },
        only: function(children) {
          if (!isValidElement2(children))
            throw Error(
              "React.Children.only expected to receive a single React element child."
            );
          return children;
        }
      };
      exports.Component = Component4;
      exports.Fragment = REACT_FRAGMENT_TYPE;
      exports.Profiler = REACT_PROFILER_TYPE;
      exports.PureComponent = PureComponent;
      exports.StrictMode = REACT_STRICT_MODE_TYPE;
      exports.Suspense = REACT_SUSPENSE_TYPE;
      exports.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = ReactSharedInternals;
      exports.act = function(callback) {
        var prevActQueue = ReactSharedInternals.actQueue, prevActScopeDepth = actScopeDepth;
        actScopeDepth++;
        var queue = ReactSharedInternals.actQueue = null !== prevActQueue ? prevActQueue : [], didAwaitActCall = false;
        try {
          var result = callback();
        } catch (error) {
          ReactSharedInternals.thrownErrors.push(error);
        }
        if (0 < ReactSharedInternals.thrownErrors.length)
          throw popActScope(prevActQueue, prevActScopeDepth), callback = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, callback;
        if (null !== result && "object" === typeof result && "function" === typeof result.then) {
          var thenable = result;
          queueSeveralMicrotasks(function() {
            didAwaitActCall || didWarnNoAwaitAct || (didWarnNoAwaitAct = true, console.error(
              "You called act(async () => ...) without await. This could lead to unexpected testing behaviour, interleaving multiple act calls and mixing their scopes. You should - await act(async () => ...);"
            ));
          });
          return {
            then: function(resolve, reject) {
              didAwaitActCall = true;
              thenable.then(
                function(returnValue) {
                  popActScope(prevActQueue, prevActScopeDepth);
                  if (0 === prevActScopeDepth) {
                    try {
                      flushActQueue(queue), enqueueTask(function() {
                        return recursivelyFlushAsyncActWork(
                          returnValue,
                          resolve,
                          reject
                        );
                      });
                    } catch (error$2) {
                      ReactSharedInternals.thrownErrors.push(error$2);
                    }
                    if (0 < ReactSharedInternals.thrownErrors.length) {
                      var _thrownError = aggregateErrors(
                        ReactSharedInternals.thrownErrors
                      );
                      ReactSharedInternals.thrownErrors.length = 0;
                      reject(_thrownError);
                    }
                  } else resolve(returnValue);
                },
                function(error) {
                  popActScope(prevActQueue, prevActScopeDepth);
                  0 < ReactSharedInternals.thrownErrors.length ? (error = aggregateErrors(
                    ReactSharedInternals.thrownErrors
                  ), ReactSharedInternals.thrownErrors.length = 0, reject(error)) : reject(error);
                }
              );
            }
          };
        }
        var returnValue$jscomp$0 = result;
        popActScope(prevActQueue, prevActScopeDepth);
        0 === prevActScopeDepth && (flushActQueue(queue), 0 !== queue.length && queueSeveralMicrotasks(function() {
          didAwaitActCall || didWarnNoAwaitAct || (didWarnNoAwaitAct = true, console.error(
            "A component suspended inside an `act` scope, but the `act` call was not awaited. When testing React components that depend on asynchronous data, you must await the result:\n\nawait act(() => ...)"
          ));
        }), ReactSharedInternals.actQueue = null);
        if (0 < ReactSharedInternals.thrownErrors.length)
          throw callback = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, callback;
        return {
          then: function(resolve, reject) {
            didAwaitActCall = true;
            0 === prevActScopeDepth ? (ReactSharedInternals.actQueue = queue, enqueueTask(function() {
              return recursivelyFlushAsyncActWork(
                returnValue$jscomp$0,
                resolve,
                reject
              );
            })) : resolve(returnValue$jscomp$0);
          }
        };
      };
      exports.cache = function(fn) {
        return function() {
          return fn.apply(null, arguments);
        };
      };
      exports.cloneElement = function(element, config, children) {
        if (null === element || void 0 === element)
          throw Error(
            "The argument must be a React element, but you passed " + element + "."
          );
        var props = assign({}, element.props), key = element.key, owner = element._owner;
        if (null != config) {
          var JSCompiler_inline_result;
          a: {
            if (hasOwnProperty.call(config, "ref") && (JSCompiler_inline_result = Object.getOwnPropertyDescriptor(
              config,
              "ref"
            ).get) && JSCompiler_inline_result.isReactWarning) {
              JSCompiler_inline_result = false;
              break a;
            }
            JSCompiler_inline_result = void 0 !== config.ref;
          }
          JSCompiler_inline_result && (owner = getOwner());
          hasValidKey(config) && (checkKeyStringCoercion(config.key), key = "" + config.key);
          for (propName in config)
            !hasOwnProperty.call(config, propName) || "key" === propName || "__self" === propName || "__source" === propName || "ref" === propName && void 0 === config.ref || (props[propName] = config[propName]);
        }
        var propName = arguments.length - 2;
        if (1 === propName) props.children = children;
        else if (1 < propName) {
          JSCompiler_inline_result = Array(propName);
          for (var i = 0; i < propName; i++)
            JSCompiler_inline_result[i] = arguments[i + 2];
          props.children = JSCompiler_inline_result;
        }
        props = ReactElement(element.type, key, void 0, void 0, owner, props);
        for (key = 2; key < arguments.length; key++)
          validateChildKeys(arguments[key], props.type);
        return props;
      };
      exports.createContext = function(defaultValue) {
        defaultValue = {
          $$typeof: REACT_CONTEXT_TYPE,
          _currentValue: defaultValue,
          _currentValue2: defaultValue,
          _threadCount: 0,
          Provider: null,
          Consumer: null
        };
        defaultValue.Provider = defaultValue;
        defaultValue.Consumer = {
          $$typeof: REACT_CONSUMER_TYPE,
          _context: defaultValue
        };
        defaultValue._currentRenderer = null;
        defaultValue._currentRenderer2 = null;
        return defaultValue;
      };
      exports.createElement = function(type, config, children) {
        if (isValidElementType(type))
          for (var i = 2; i < arguments.length; i++)
            validateChildKeys(arguments[i], type);
        else {
          i = "";
          if (void 0 === type || "object" === typeof type && null !== type && 0 === Object.keys(type).length)
            i += " You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.";
          if (null === type) var typeString = "null";
          else
            isArrayImpl(type) ? typeString = "array" : void 0 !== type && type.$$typeof === REACT_ELEMENT_TYPE ? (typeString = "<" + (getComponentNameFromType(type.type) || "Unknown") + " />", i = " Did you accidentally export a JSX literal instead of a component?") : typeString = typeof type;
          console.error(
            "React.createElement: type is invalid -- expected a string (for built-in components) or a class/function (for composite components) but got: %s.%s",
            typeString,
            i
          );
        }
        var propName;
        i = {};
        typeString = null;
        if (null != config)
          for (propName in didWarnAboutOldJSXRuntime || !("__self" in config) || "key" in config || (didWarnAboutOldJSXRuntime = true, console.warn(
            "Your app (or one of its dependencies) is using an outdated JSX transform. Update to the modern JSX transform for faster performance: https://react.dev/link/new-jsx-transform"
          )), hasValidKey(config) && (checkKeyStringCoercion(config.key), typeString = "" + config.key), config)
            hasOwnProperty.call(config, propName) && "key" !== propName && "__self" !== propName && "__source" !== propName && (i[propName] = config[propName]);
        var childrenLength = arguments.length - 2;
        if (1 === childrenLength) i.children = children;
        else if (1 < childrenLength) {
          for (var childArray = Array(childrenLength), _i = 0; _i < childrenLength; _i++)
            childArray[_i] = arguments[_i + 2];
          Object.freeze && Object.freeze(childArray);
          i.children = childArray;
        }
        if (type && type.defaultProps)
          for (propName in childrenLength = type.defaultProps, childrenLength)
            void 0 === i[propName] && (i[propName] = childrenLength[propName]);
        typeString && defineKeyPropWarningGetter(
          i,
          "function" === typeof type ? type.displayName || type.name || "Unknown" : type
        );
        return ReactElement(type, typeString, void 0, void 0, getOwner(), i);
      };
      exports.createRef = function() {
        var refObject = { current: null };
        Object.seal(refObject);
        return refObject;
      };
      exports.forwardRef = function(render) {
        null != render && render.$$typeof === REACT_MEMO_TYPE ? console.error(
          "forwardRef requires a render function but received a `memo` component. Instead of forwardRef(memo(...)), use memo(forwardRef(...))."
        ) : "function" !== typeof render ? console.error(
          "forwardRef requires a render function but was given %s.",
          null === render ? "null" : typeof render
        ) : 0 !== render.length && 2 !== render.length && console.error(
          "forwardRef render functions accept exactly two parameters: props and ref. %s",
          1 === render.length ? "Did you forget to use the ref parameter?" : "Any additional parameter will be undefined."
        );
        null != render && null != render.defaultProps && console.error(
          "forwardRef render functions do not support defaultProps. Did you accidentally pass a React component?"
        );
        var elementType = { $$typeof: REACT_FORWARD_REF_TYPE, render }, ownName;
        Object.defineProperty(elementType, "displayName", {
          enumerable: false,
          configurable: true,
          get: function() {
            return ownName;
          },
          set: function(name) {
            ownName = name;
            render.name || render.displayName || (Object.defineProperty(render, "name", { value: name }), render.displayName = name);
          }
        });
        return elementType;
      };
      exports.isValidElement = isValidElement2;
      exports.lazy = function(ctor) {
        return {
          $$typeof: REACT_LAZY_TYPE,
          _payload: { _status: -1, _result: ctor },
          _init: lazyInitializer
        };
      };
      exports.memo = function(type, compare) {
        isValidElementType(type) || console.error(
          "memo: The first argument must be a component. Instead received: %s",
          null === type ? "null" : typeof type
        );
        compare = {
          $$typeof: REACT_MEMO_TYPE,
          type,
          compare: void 0 === compare ? null : compare
        };
        var ownName;
        Object.defineProperty(compare, "displayName", {
          enumerable: false,
          configurable: true,
          get: function() {
            return ownName;
          },
          set: function(name) {
            ownName = name;
            type.name || type.displayName || (Object.defineProperty(type, "name", { value: name }), type.displayName = name);
          }
        });
        return compare;
      };
      exports.startTransition = function(scope) {
        var prevTransition = ReactSharedInternals.T, currentTransition = {};
        ReactSharedInternals.T = currentTransition;
        currentTransition._updatedFibers = /* @__PURE__ */ new Set();
        try {
          var returnValue = scope(), onStartTransitionFinish = ReactSharedInternals.S;
          null !== onStartTransitionFinish && onStartTransitionFinish(currentTransition, returnValue);
          "object" === typeof returnValue && null !== returnValue && "function" === typeof returnValue.then && returnValue.then(noop, reportGlobalError);
        } catch (error) {
          reportGlobalError(error);
        } finally {
          null === prevTransition && currentTransition._updatedFibers && (scope = currentTransition._updatedFibers.size, currentTransition._updatedFibers.clear(), 10 < scope && console.warn(
            "Detected a large number of updates inside startTransition. If this is due to a subscription please re-write it to use React provided hooks. Otherwise concurrent mode guarantees are off the table."
          )), ReactSharedInternals.T = prevTransition;
        }
      };
      exports.unstable_useCacheRefresh = function() {
        return resolveDispatcher().useCacheRefresh();
      };
      exports.use = function(usable) {
        return resolveDispatcher().use(usable);
      };
      exports.useActionState = function(action, initialState, permalink) {
        return resolveDispatcher().useActionState(
          action,
          initialState,
          permalink
        );
      };
      exports.useCallback = function(callback, deps) {
        return resolveDispatcher().useCallback(callback, deps);
      };
      exports.useContext = function(Context) {
        var dispatcher = resolveDispatcher();
        Context.$$typeof === REACT_CONSUMER_TYPE && console.error(
          "Calling useContext(Context.Consumer) is not supported and will cause bugs. Did you mean to call useContext(Context) instead?"
        );
        return dispatcher.useContext(Context);
      };
      exports.useDebugValue = function(value, formatterFn) {
        return resolveDispatcher().useDebugValue(value, formatterFn);
      };
      exports.useDeferredValue = function(value, initialValue) {
        return resolveDispatcher().useDeferredValue(value, initialValue);
      };
      exports.useEffect = function(create, deps) {
        return resolveDispatcher().useEffect(create, deps);
      };
      exports.useId = function() {
        return resolveDispatcher().useId();
      };
      exports.useImperativeHandle = function(ref, create, deps) {
        return resolveDispatcher().useImperativeHandle(ref, create, deps);
      };
      exports.useInsertionEffect = function(create, deps) {
        return resolveDispatcher().useInsertionEffect(create, deps);
      };
      exports.useLayoutEffect = function(create, deps) {
        return resolveDispatcher().useLayoutEffect(create, deps);
      };
      exports.useMemo = function(create, deps) {
        return resolveDispatcher().useMemo(create, deps);
      };
      exports.useOptimistic = function(passthrough, reducer) {
        return resolveDispatcher().useOptimistic(passthrough, reducer);
      };
      exports.useReducer = function(reducer, initialArg, init) {
        return resolveDispatcher().useReducer(reducer, initialArg, init);
      };
      exports.useRef = function(initialValue) {
        return resolveDispatcher().useRef(initialValue);
      };
      exports.useState = function(initialState) {
        return resolveDispatcher().useState(initialState);
      };
      exports.useSyncExternalStore = function(subscribe, getSnapshot, getServerSnapshot) {
        return resolveDispatcher().useSyncExternalStore(
          subscribe,
          getSnapshot,
          getServerSnapshot
        );
      };
      exports.useTransition = function() {
        return resolveDispatcher().useTransition();
      };
      exports.version = "19.0.0";
      "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error());
    })();
  }
});

// node_modules/react/index.js
var require_react = __commonJS({
  "node_modules/react/index.js"(exports, module) {
    "use strict";
    if (false) {
      module.exports = null;
    } else {
      module.exports = require_react_development();
    }
  }
});

// node_modules/react/cjs/react-jsx-runtime.development.js
var require_react_jsx_runtime_development = __commonJS({
  "node_modules/react/cjs/react-jsx-runtime.development.js"(exports) {
    "use strict";
    (function() {
      function getComponentNameFromType(type) {
        if (null == type) return null;
        if ("function" === typeof type)
          return type.$$typeof === REACT_CLIENT_REFERENCE$2 ? null : type.displayName || type.name || null;
        if ("string" === typeof type) return type;
        switch (type) {
          case REACT_FRAGMENT_TYPE:
            return "Fragment";
          case REACT_PORTAL_TYPE:
            return "Portal";
          case REACT_PROFILER_TYPE:
            return "Profiler";
          case REACT_STRICT_MODE_TYPE:
            return "StrictMode";
          case REACT_SUSPENSE_TYPE:
            return "Suspense";
          case REACT_SUSPENSE_LIST_TYPE:
            return "SuspenseList";
        }
        if ("object" === typeof type)
          switch ("number" === typeof type.tag && console.error(
            "Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."
          ), type.$$typeof) {
            case REACT_CONTEXT_TYPE:
              return (type.displayName || "Context") + ".Provider";
            case REACT_CONSUMER_TYPE:
              return (type._context.displayName || "Context") + ".Consumer";
            case REACT_FORWARD_REF_TYPE:
              var innerType = type.render;
              type = type.displayName;
              type || (type = innerType.displayName || innerType.name || "", type = "" !== type ? "ForwardRef(" + type + ")" : "ForwardRef");
              return type;
            case REACT_MEMO_TYPE:
              return innerType = type.displayName || null, null !== innerType ? innerType : getComponentNameFromType(type.type) || "Memo";
            case REACT_LAZY_TYPE:
              innerType = type._payload;
              type = type._init;
              try {
                return getComponentNameFromType(type(innerType));
              } catch (x) {
              }
          }
        return null;
      }
      function testStringCoercion(value) {
        return "" + value;
      }
      function checkKeyStringCoercion(value) {
        try {
          testStringCoercion(value);
          var JSCompiler_inline_result = false;
        } catch (e) {
          JSCompiler_inline_result = true;
        }
        if (JSCompiler_inline_result) {
          JSCompiler_inline_result = console;
          var JSCompiler_temp_const = JSCompiler_inline_result.error;
          var JSCompiler_inline_result$jscomp$0 = "function" === typeof Symbol && Symbol.toStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
          JSCompiler_temp_const.call(
            JSCompiler_inline_result,
            "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.",
            JSCompiler_inline_result$jscomp$0
          );
          return testStringCoercion(value);
        }
      }
      function disabledLog() {
      }
      function disableLogs() {
        if (0 === disabledDepth) {
          prevLog = console.log;
          prevInfo = console.info;
          prevWarn = console.warn;
          prevError = console.error;
          prevGroup = console.group;
          prevGroupCollapsed = console.groupCollapsed;
          prevGroupEnd = console.groupEnd;
          var props = {
            configurable: true,
            enumerable: true,
            value: disabledLog,
            writable: true
          };
          Object.defineProperties(console, {
            info: props,
            log: props,
            warn: props,
            error: props,
            group: props,
            groupCollapsed: props,
            groupEnd: props
          });
        }
        disabledDepth++;
      }
      function reenableLogs() {
        disabledDepth--;
        if (0 === disabledDepth) {
          var props = { configurable: true, enumerable: true, writable: true };
          Object.defineProperties(console, {
            log: assign({}, props, { value: prevLog }),
            info: assign({}, props, { value: prevInfo }),
            warn: assign({}, props, { value: prevWarn }),
            error: assign({}, props, { value: prevError }),
            group: assign({}, props, { value: prevGroup }),
            groupCollapsed: assign({}, props, { value: prevGroupCollapsed }),
            groupEnd: assign({}, props, { value: prevGroupEnd })
          });
        }
        0 > disabledDepth && console.error(
          "disabledDepth fell below zero. This is a bug in React. Please file an issue."
        );
      }
      function describeBuiltInComponentFrame(name) {
        if (void 0 === prefix)
          try {
            throw Error();
          } catch (x) {
            var match = x.stack.trim().match(/\n( *(at )?)/);
            prefix = match && match[1] || "";
            suffix = -1 < x.stack.indexOf("\n    at") ? " (<anonymous>)" : -1 < x.stack.indexOf("@") ? "@unknown:0:0" : "";
          }
        return "\n" + prefix + name + suffix;
      }
      function describeNativeComponentFrame(fn, construct) {
        if (!fn || reentry) return "";
        var frame = componentFrameCache.get(fn);
        if (void 0 !== frame) return frame;
        reentry = true;
        frame = Error.prepareStackTrace;
        Error.prepareStackTrace = void 0;
        var previousDispatcher = null;
        previousDispatcher = ReactSharedInternals.H;
        ReactSharedInternals.H = null;
        disableLogs();
        try {
          var RunInRootFrame = {
            DetermineComponentFrameRoot: function() {
              try {
                if (construct) {
                  var Fake = function() {
                    throw Error();
                  };
                  Object.defineProperty(Fake.prototype, "props", {
                    set: function() {
                      throw Error();
                    }
                  });
                  if ("object" === typeof Reflect && Reflect.construct) {
                    try {
                      Reflect.construct(Fake, []);
                    } catch (x) {
                      var control = x;
                    }
                    Reflect.construct(fn, [], Fake);
                  } else {
                    try {
                      Fake.call();
                    } catch (x$0) {
                      control = x$0;
                    }
                    fn.call(Fake.prototype);
                  }
                } else {
                  try {
                    throw Error();
                  } catch (x$1) {
                    control = x$1;
                  }
                  (Fake = fn()) && "function" === typeof Fake.catch && Fake.catch(function() {
                  });
                }
              } catch (sample) {
                if (sample && control && "string" === typeof sample.stack)
                  return [sample.stack, control.stack];
              }
              return [null, null];
            }
          };
          RunInRootFrame.DetermineComponentFrameRoot.displayName = "DetermineComponentFrameRoot";
          var namePropDescriptor = Object.getOwnPropertyDescriptor(
            RunInRootFrame.DetermineComponentFrameRoot,
            "name"
          );
          namePropDescriptor && namePropDescriptor.configurable && Object.defineProperty(
            RunInRootFrame.DetermineComponentFrameRoot,
            "name",
            { value: "DetermineComponentFrameRoot" }
          );
          var _RunInRootFrame$Deter = RunInRootFrame.DetermineComponentFrameRoot(), sampleStack = _RunInRootFrame$Deter[0], controlStack = _RunInRootFrame$Deter[1];
          if (sampleStack && controlStack) {
            var sampleLines = sampleStack.split("\n"), controlLines = controlStack.split("\n");
            for (_RunInRootFrame$Deter = namePropDescriptor = 0; namePropDescriptor < sampleLines.length && !sampleLines[namePropDescriptor].includes(
              "DetermineComponentFrameRoot"
            ); )
              namePropDescriptor++;
            for (; _RunInRootFrame$Deter < controlLines.length && !controlLines[_RunInRootFrame$Deter].includes(
              "DetermineComponentFrameRoot"
            ); )
              _RunInRootFrame$Deter++;
            if (namePropDescriptor === sampleLines.length || _RunInRootFrame$Deter === controlLines.length)
              for (namePropDescriptor = sampleLines.length - 1, _RunInRootFrame$Deter = controlLines.length - 1; 1 <= namePropDescriptor && 0 <= _RunInRootFrame$Deter && sampleLines[namePropDescriptor] !== controlLines[_RunInRootFrame$Deter]; )
                _RunInRootFrame$Deter--;
            for (; 1 <= namePropDescriptor && 0 <= _RunInRootFrame$Deter; namePropDescriptor--, _RunInRootFrame$Deter--)
              if (sampleLines[namePropDescriptor] !== controlLines[_RunInRootFrame$Deter]) {
                if (1 !== namePropDescriptor || 1 !== _RunInRootFrame$Deter) {
                  do
                    if (namePropDescriptor--, _RunInRootFrame$Deter--, 0 > _RunInRootFrame$Deter || sampleLines[namePropDescriptor] !== controlLines[_RunInRootFrame$Deter]) {
                      var _frame = "\n" + sampleLines[namePropDescriptor].replace(
                        " at new ",
                        " at "
                      );
                      fn.displayName && _frame.includes("<anonymous>") && (_frame = _frame.replace("<anonymous>", fn.displayName));
                      "function" === typeof fn && componentFrameCache.set(fn, _frame);
                      return _frame;
                    }
                  while (1 <= namePropDescriptor && 0 <= _RunInRootFrame$Deter);
                }
                break;
              }
          }
        } finally {
          reentry = false, ReactSharedInternals.H = previousDispatcher, reenableLogs(), Error.prepareStackTrace = frame;
        }
        sampleLines = (sampleLines = fn ? fn.displayName || fn.name : "") ? describeBuiltInComponentFrame(sampleLines) : "";
        "function" === typeof fn && componentFrameCache.set(fn, sampleLines);
        return sampleLines;
      }
      function describeUnknownElementTypeFrameInDEV(type) {
        if (null == type) return "";
        if ("function" === typeof type) {
          var prototype = type.prototype;
          return describeNativeComponentFrame(
            type,
            !(!prototype || !prototype.isReactComponent)
          );
        }
        if ("string" === typeof type) return describeBuiltInComponentFrame(type);
        switch (type) {
          case REACT_SUSPENSE_TYPE:
            return describeBuiltInComponentFrame("Suspense");
          case REACT_SUSPENSE_LIST_TYPE:
            return describeBuiltInComponentFrame("SuspenseList");
        }
        if ("object" === typeof type)
          switch (type.$$typeof) {
            case REACT_FORWARD_REF_TYPE:
              return type = describeNativeComponentFrame(type.render, false), type;
            case REACT_MEMO_TYPE:
              return describeUnknownElementTypeFrameInDEV(type.type);
            case REACT_LAZY_TYPE:
              prototype = type._payload;
              type = type._init;
              try {
                return describeUnknownElementTypeFrameInDEV(type(prototype));
              } catch (x) {
              }
          }
        return "";
      }
      function getOwner() {
        var dispatcher = ReactSharedInternals.A;
        return null === dispatcher ? null : dispatcher.getOwner();
      }
      function hasValidKey(config) {
        if (hasOwnProperty.call(config, "key")) {
          var getter = Object.getOwnPropertyDescriptor(config, "key").get;
          if (getter && getter.isReactWarning) return false;
        }
        return void 0 !== config.key;
      }
      function defineKeyPropWarningGetter(props, displayName) {
        function warnAboutAccessingKey() {
          specialPropKeyWarningShown || (specialPropKeyWarningShown = true, console.error(
            "%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://react.dev/link/special-props)",
            displayName
          ));
        }
        warnAboutAccessingKey.isReactWarning = true;
        Object.defineProperty(props, "key", {
          get: warnAboutAccessingKey,
          configurable: true
        });
      }
      function elementRefGetterWithDeprecationWarning() {
        var componentName = getComponentNameFromType(this.type);
        didWarnAboutElementRef[componentName] || (didWarnAboutElementRef[componentName] = true, console.error(
          "Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release."
        ));
        componentName = this.props.ref;
        return void 0 !== componentName ? componentName : null;
      }
      function ReactElement(type, key, self, source, owner, props) {
        self = props.ref;
        type = {
          $$typeof: REACT_ELEMENT_TYPE,
          type,
          key,
          props,
          _owner: owner
        };
        null !== (void 0 !== self ? self : null) ? Object.defineProperty(type, "ref", {
          enumerable: false,
          get: elementRefGetterWithDeprecationWarning
        }) : Object.defineProperty(type, "ref", { enumerable: false, value: null });
        type._store = {};
        Object.defineProperty(type._store, "validated", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: 0
        });
        Object.defineProperty(type, "_debugInfo", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: null
        });
        Object.freeze && (Object.freeze(type.props), Object.freeze(type));
        return type;
      }
      function jsxDEVImpl(type, config, maybeKey, isStaticChildren, source, self) {
        if ("string" === typeof type || "function" === typeof type || type === REACT_FRAGMENT_TYPE || type === REACT_PROFILER_TYPE || type === REACT_STRICT_MODE_TYPE || type === REACT_SUSPENSE_TYPE || type === REACT_SUSPENSE_LIST_TYPE || type === REACT_OFFSCREEN_TYPE || "object" === typeof type && null !== type && (type.$$typeof === REACT_LAZY_TYPE || type.$$typeof === REACT_MEMO_TYPE || type.$$typeof === REACT_CONTEXT_TYPE || type.$$typeof === REACT_CONSUMER_TYPE || type.$$typeof === REACT_FORWARD_REF_TYPE || type.$$typeof === REACT_CLIENT_REFERENCE$1 || void 0 !== type.getModuleId)) {
          var children = config.children;
          if (void 0 !== children)
            if (isStaticChildren)
              if (isArrayImpl(children)) {
                for (isStaticChildren = 0; isStaticChildren < children.length; isStaticChildren++)
                  validateChildKeys(children[isStaticChildren], type);
                Object.freeze && Object.freeze(children);
              } else
                console.error(
                  "React.jsx: Static children should always be an array. You are likely explicitly calling React.jsxs or React.jsxDEV. Use the Babel transform instead."
                );
            else validateChildKeys(children, type);
        } else {
          children = "";
          if (void 0 === type || "object" === typeof type && null !== type && 0 === Object.keys(type).length)
            children += " You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.";
          null === type ? isStaticChildren = "null" : isArrayImpl(type) ? isStaticChildren = "array" : void 0 !== type && type.$$typeof === REACT_ELEMENT_TYPE ? (isStaticChildren = "<" + (getComponentNameFromType(type.type) || "Unknown") + " />", children = " Did you accidentally export a JSX literal instead of a component?") : isStaticChildren = typeof type;
          console.error(
            "React.jsx: type is invalid -- expected a string (for built-in components) or a class/function (for composite components) but got: %s.%s",
            isStaticChildren,
            children
          );
        }
        if (hasOwnProperty.call(config, "key")) {
          children = getComponentNameFromType(type);
          var keys = Object.keys(config).filter(function(k) {
            return "key" !== k;
          });
          isStaticChildren = 0 < keys.length ? "{key: someKey, " + keys.join(": ..., ") + ": ...}" : "{key: someKey}";
          didWarnAboutKeySpread[children + isStaticChildren] || (keys = 0 < keys.length ? "{" + keys.join(": ..., ") + ": ...}" : "{}", console.error(
            'A props object containing a "key" prop is being spread into JSX:\n  let props = %s;\n  <%s {...props} />\nReact keys must be passed directly to JSX without using spread:\n  let props = %s;\n  <%s key={someKey} {...props} />',
            isStaticChildren,
            children,
            keys,
            children
          ), didWarnAboutKeySpread[children + isStaticChildren] = true);
        }
        children = null;
        void 0 !== maybeKey && (checkKeyStringCoercion(maybeKey), children = "" + maybeKey);
        hasValidKey(config) && (checkKeyStringCoercion(config.key), children = "" + config.key);
        if ("key" in config) {
          maybeKey = {};
          for (var propName in config)
            "key" !== propName && (maybeKey[propName] = config[propName]);
        } else maybeKey = config;
        children && defineKeyPropWarningGetter(
          maybeKey,
          "function" === typeof type ? type.displayName || type.name || "Unknown" : type
        );
        return ReactElement(type, children, self, source, getOwner(), maybeKey);
      }
      function validateChildKeys(node, parentType) {
        if ("object" === typeof node && node && node.$$typeof !== REACT_CLIENT_REFERENCE) {
          if (isArrayImpl(node))
            for (var i = 0; i < node.length; i++) {
              var child = node[i];
              isValidElement2(child) && validateExplicitKey(child, parentType);
            }
          else if (isValidElement2(node))
            node._store && (node._store.validated = 1);
          else if (null === node || "object" !== typeof node ? i = null : (i = MAYBE_ITERATOR_SYMBOL && node[MAYBE_ITERATOR_SYMBOL] || node["@@iterator"], i = "function" === typeof i ? i : null), "function" === typeof i && i !== node.entries && (i = i.call(node), i !== node))
            for (; !(node = i.next()).done; )
              isValidElement2(node.value) && validateExplicitKey(node.value, parentType);
        }
      }
      function isValidElement2(object) {
        return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
      }
      function validateExplicitKey(element, parentType) {
        if (element._store && !element._store.validated && null == element.key && (element._store.validated = 1, parentType = getCurrentComponentErrorInfo(parentType), !ownerHasKeyUseWarning[parentType])) {
          ownerHasKeyUseWarning[parentType] = true;
          var childOwner = "";
          element && null != element._owner && element._owner !== getOwner() && (childOwner = null, "number" === typeof element._owner.tag ? childOwner = getComponentNameFromType(element._owner.type) : "string" === typeof element._owner.name && (childOwner = element._owner.name), childOwner = " It was passed a child from " + childOwner + ".");
          var prevGetCurrentStack = ReactSharedInternals.getCurrentStack;
          ReactSharedInternals.getCurrentStack = function() {
            var stack = describeUnknownElementTypeFrameInDEV(element.type);
            prevGetCurrentStack && (stack += prevGetCurrentStack() || "");
            return stack;
          };
          console.error(
            'Each child in a list should have a unique "key" prop.%s%s See https://react.dev/link/warning-keys for more information.',
            parentType,
            childOwner
          );
          ReactSharedInternals.getCurrentStack = prevGetCurrentStack;
        }
      }
      function getCurrentComponentErrorInfo(parentType) {
        var info = "", owner = getOwner();
        owner && (owner = getComponentNameFromType(owner.type)) && (info = "\n\nCheck the render method of `" + owner + "`.");
        info || (parentType = getComponentNameFromType(parentType)) && (info = "\n\nCheck the top-level render call using <" + parentType + ">.");
        return info;
      }
      var React14 = require_react(), REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = Symbol.for("react.profiler");
      Symbol.for("react.provider");
      var REACT_CONSUMER_TYPE = Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"), REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"), REACT_MEMO_TYPE = Symbol.for("react.memo"), REACT_LAZY_TYPE = Symbol.for("react.lazy"), REACT_OFFSCREEN_TYPE = Symbol.for("react.offscreen"), MAYBE_ITERATOR_SYMBOL = Symbol.iterator, REACT_CLIENT_REFERENCE$2 = Symbol.for("react.client.reference"), ReactSharedInternals = React14.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, hasOwnProperty = Object.prototype.hasOwnProperty, assign = Object.assign, REACT_CLIENT_REFERENCE$1 = Symbol.for("react.client.reference"), isArrayImpl = Array.isArray, disabledDepth = 0, prevLog, prevInfo, prevWarn, prevError, prevGroup, prevGroupCollapsed, prevGroupEnd;
      disabledLog.__reactDisabledLog = true;
      var prefix, suffix, reentry = false;
      var componentFrameCache = new ("function" === typeof WeakMap ? WeakMap : Map)();
      var REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference"), specialPropKeyWarningShown;
      var didWarnAboutElementRef = {};
      var didWarnAboutKeySpread = {}, ownerHasKeyUseWarning = {};
      exports.Fragment = REACT_FRAGMENT_TYPE;
      exports.jsx = function(type, config, maybeKey, source, self) {
        return jsxDEVImpl(type, config, maybeKey, false, source, self);
      };
      exports.jsxs = function(type, config, maybeKey, source, self) {
        return jsxDEVImpl(type, config, maybeKey, true, source, self);
      };
    })();
  }
});

// node_modules/react/jsx-runtime.js
var require_jsx_runtime = __commonJS({
  "node_modules/react/jsx-runtime.js"(exports, module) {
    "use strict";
    if (false) {
      module.exports = null;
    } else {
      module.exports = require_react_jsx_runtime_development();
    }
  }
});

// src/pages/PostProcessorGeneratorPage.tsx
var import_react11 = __toESM(require_react(), 1);

// node_modules/react-router/dist/development/chunk-K6AXKMTT.mjs
var React3 = __toESM(require_react(), 1);
var React = __toESM(require_react(), 1);
var React2 = __toESM(require_react(), 1);
var React10 = __toESM(require_react(), 1);
var React9 = __toESM(require_react(), 1);
var React4 = __toESM(require_react(), 1);
var React8 = __toESM(require_react(), 1);
var React7 = __toESM(require_react(), 1);
var React5 = __toESM(require_react(), 1);
var React6 = __toESM(require_react(), 1);
var React11 = __toESM(require_react(), 1);
var React12 = __toESM(require_react(), 1);
var React13 = __toESM(require_react(), 1);
function invariant(value, message) {
  if (value === false || value === null || typeof value === "undefined") {
    throw new Error(message);
  }
}
function warning(cond, message) {
  if (!cond) {
    if (typeof console !== "undefined") console.warn(message);
    try {
      throw new Error(message);
    } catch (e) {
    }
  }
}
function createPath({
  pathname = "/",
  search = "",
  hash = ""
}) {
  if (search && search !== "?")
    pathname += search.charAt(0) === "?" ? search : "?" + search;
  if (hash && hash !== "#")
    pathname += hash.charAt(0) === "#" ? hash : "#" + hash;
  return pathname;
}
function parsePath(path) {
  let parsedPath = {};
  if (path) {
    let hashIndex = path.indexOf("#");
    if (hashIndex >= 0) {
      parsedPath.hash = path.substring(hashIndex);
      path = path.substring(0, hashIndex);
    }
    let searchIndex = path.indexOf("?");
    if (searchIndex >= 0) {
      parsedPath.search = path.substring(searchIndex);
      path = path.substring(0, searchIndex);
    }
    if (path) {
      parsedPath.pathname = path;
    }
  }
  return parsedPath;
}
function matchRoutes(routes, locationArg, basename = "/") {
  return matchRoutesImpl(routes, locationArg, basename, false);
}
function matchRoutesImpl(routes, locationArg, basename, allowPartial) {
  let location = typeof locationArg === "string" ? parsePath(locationArg) : locationArg;
  let pathname = stripBasename(location.pathname || "/", basename);
  if (pathname == null) {
    return null;
  }
  let branches = flattenRoutes(routes);
  rankRouteBranches(branches);
  let matches = null;
  for (let i = 0; matches == null && i < branches.length; ++i) {
    let decoded = decodePath(pathname);
    matches = matchRouteBranch(
      branches[i],
      decoded,
      allowPartial
    );
  }
  return matches;
}
function convertRouteMatchToUiMatch(match, loaderData) {
  let { route, pathname, params } = match;
  return {
    id: route.id,
    pathname,
    params,
    data: loaderData[route.id],
    handle: route.handle
  };
}
function flattenRoutes(routes, branches = [], parentsMeta = [], parentPath = "") {
  let flattenRoute = (route, index, relativePath) => {
    let meta = {
      relativePath: relativePath === void 0 ? route.path || "" : relativePath,
      caseSensitive: route.caseSensitive === true,
      childrenIndex: index,
      route
    };
    if (meta.relativePath.startsWith("/")) {
      invariant(
        meta.relativePath.startsWith(parentPath),
        `Absolute route path "${meta.relativePath}" nested under path "${parentPath}" is not valid. An absolute child route path must start with the combined path of all its parent routes.`
      );
      meta.relativePath = meta.relativePath.slice(parentPath.length);
    }
    let path = joinPaths([parentPath, meta.relativePath]);
    let routesMeta = parentsMeta.concat(meta);
    if (route.children && route.children.length > 0) {
      invariant(
        // Our types know better, but runtime JS may not!
        // @ts-expect-error
        route.index !== true,
        `Index routes must not have child routes. Please remove all child routes from route path "${path}".`
      );
      flattenRoutes(route.children, branches, routesMeta, path);
    }
    if (route.path == null && !route.index) {
      return;
    }
    branches.push({
      path,
      score: computeScore(path, route.index),
      routesMeta
    });
  };
  routes.forEach((route, index) => {
    if (route.path === "" || !route.path?.includes("?")) {
      flattenRoute(route, index);
    } else {
      for (let exploded of explodeOptionalSegments(route.path)) {
        flattenRoute(route, index, exploded);
      }
    }
  });
  return branches;
}
function explodeOptionalSegments(path) {
  let segments = path.split("/");
  if (segments.length === 0) return [];
  let [first, ...rest] = segments;
  let isOptional = first.endsWith("?");
  let required = first.replace(/\?$/, "");
  if (rest.length === 0) {
    return isOptional ? [required, ""] : [required];
  }
  let restExploded = explodeOptionalSegments(rest.join("/"));
  let result = [];
  result.push(
    ...restExploded.map(
      (subpath) => subpath === "" ? required : [required, subpath].join("/")
    )
  );
  if (isOptional) {
    result.push(...restExploded);
  }
  return result.map(
    (exploded) => path.startsWith("/") && exploded === "" ? "/" : exploded
  );
}
function rankRouteBranches(branches) {
  branches.sort(
    (a, b) => a.score !== b.score ? b.score - a.score : compareIndexes(
      a.routesMeta.map((meta) => meta.childrenIndex),
      b.routesMeta.map((meta) => meta.childrenIndex)
    )
  );
}
var paramRe = /^:[\w-]+$/;
var dynamicSegmentValue = 3;
var indexRouteValue = 2;
var emptySegmentValue = 1;
var staticSegmentValue = 10;
var splatPenalty = -2;
var isSplat = (s) => s === "*";
function computeScore(path, index) {
  let segments = path.split("/");
  let initialScore = segments.length;
  if (segments.some(isSplat)) {
    initialScore += splatPenalty;
  }
  if (index) {
    initialScore += indexRouteValue;
  }
  return segments.filter((s) => !isSplat(s)).reduce(
    (score, segment) => score + (paramRe.test(segment) ? dynamicSegmentValue : segment === "" ? emptySegmentValue : staticSegmentValue),
    initialScore
  );
}
function compareIndexes(a, b) {
  let siblings = a.length === b.length && a.slice(0, -1).every((n, i) => n === b[i]);
  return siblings ? (
    // If two routes are siblings, we should try to match the earlier sibling
    // first. This allows people to have fine-grained control over the matching
    // behavior by simply putting routes with identical paths in the order they
    // want them tried.
    a[a.length - 1] - b[b.length - 1]
  ) : (
    // Otherwise, it doesn't really make sense to rank non-siblings by index,
    // so they sort equally.
    0
  );
}
function matchRouteBranch(branch, pathname, allowPartial = false) {
  let { routesMeta } = branch;
  let matchedParams = {};
  let matchedPathname = "/";
  let matches = [];
  for (let i = 0; i < routesMeta.length; ++i) {
    let meta = routesMeta[i];
    let end = i === routesMeta.length - 1;
    let remainingPathname = matchedPathname === "/" ? pathname : pathname.slice(matchedPathname.length) || "/";
    let match = matchPath(
      { path: meta.relativePath, caseSensitive: meta.caseSensitive, end },
      remainingPathname
    );
    let route = meta.route;
    if (!match && end && allowPartial && !routesMeta[routesMeta.length - 1].route.index) {
      match = matchPath(
        {
          path: meta.relativePath,
          caseSensitive: meta.caseSensitive,
          end: false
        },
        remainingPathname
      );
    }
    if (!match) {
      return null;
    }
    Object.assign(matchedParams, match.params);
    matches.push({
      // TODO: Can this as be avoided?
      params: matchedParams,
      pathname: joinPaths([matchedPathname, match.pathname]),
      pathnameBase: normalizePathname(
        joinPaths([matchedPathname, match.pathnameBase])
      ),
      route
    });
    if (match.pathnameBase !== "/") {
      matchedPathname = joinPaths([matchedPathname, match.pathnameBase]);
    }
  }
  return matches;
}
function matchPath(pattern, pathname) {
  if (typeof pattern === "string") {
    pattern = { path: pattern, caseSensitive: false, end: true };
  }
  let [matcher, compiledParams] = compilePath(
    pattern.path,
    pattern.caseSensitive,
    pattern.end
  );
  let match = pathname.match(matcher);
  if (!match) return null;
  let matchedPathname = match[0];
  let pathnameBase = matchedPathname.replace(/(.)\/+$/, "$1");
  let captureGroups = match.slice(1);
  let params = compiledParams.reduce(
    (memo2, { paramName, isOptional }, index) => {
      if (paramName === "*") {
        let splatValue = captureGroups[index] || "";
        pathnameBase = matchedPathname.slice(0, matchedPathname.length - splatValue.length).replace(/(.)\/+$/, "$1");
      }
      const value = captureGroups[index];
      if (isOptional && !value) {
        memo2[paramName] = void 0;
      } else {
        memo2[paramName] = (value || "").replace(/%2F/g, "/");
      }
      return memo2;
    },
    {}
  );
  return {
    params,
    pathname: matchedPathname,
    pathnameBase,
    pattern
  };
}
function compilePath(path, caseSensitive = false, end = true) {
  warning(
    path === "*" || !path.endsWith("*") || path.endsWith("/*"),
    `Route path "${path}" will be treated as if it were "${path.replace(/\*$/, "/*")}" because the \`*\` character must always follow a \`/\` in the pattern. To get rid of this warning, please change the route path to "${path.replace(/\*$/, "/*")}".`
  );
  let params = [];
  let regexpSource = "^" + path.replace(/\/*\*?$/, "").replace(/^\/*/, "/").replace(/[\\.*+^${}|()[\]]/g, "\\$&").replace(
    /\/:([\w-]+)(\?)?/g,
    (_, paramName, isOptional) => {
      params.push({ paramName, isOptional: isOptional != null });
      return isOptional ? "/?([^\\/]+)?" : "/([^\\/]+)";
    }
  );
  if (path.endsWith("*")) {
    params.push({ paramName: "*" });
    regexpSource += path === "*" || path === "/*" ? "(.*)$" : "(?:\\/(.+)|\\/*)$";
  } else if (end) {
    regexpSource += "\\/*$";
  } else if (path !== "" && path !== "/") {
    regexpSource += "(?:(?=\\/|$))";
  } else {
  }
  let matcher = new RegExp(regexpSource, caseSensitive ? void 0 : "i");
  return [matcher, params];
}
function decodePath(value) {
  try {
    return value.split("/").map((v) => decodeURIComponent(v).replace(/\//g, "%2F")).join("/");
  } catch (error) {
    warning(
      false,
      `The URL path "${value}" could not be decoded because it is is a malformed URL segment. This is probably due to a bad percent encoding (${error}).`
    );
    return value;
  }
}
function stripBasename(pathname, basename) {
  if (basename === "/") return pathname;
  if (!pathname.toLowerCase().startsWith(basename.toLowerCase())) {
    return null;
  }
  let startIndex = basename.endsWith("/") ? basename.length - 1 : basename.length;
  let nextChar = pathname.charAt(startIndex);
  if (nextChar && nextChar !== "/") {
    return null;
  }
  return pathname.slice(startIndex) || "/";
}
function resolvePath(to, fromPathname = "/") {
  let {
    pathname: toPathname,
    search = "",
    hash = ""
  } = typeof to === "string" ? parsePath(to) : to;
  let pathname = toPathname ? toPathname.startsWith("/") ? toPathname : resolvePathname(toPathname, fromPathname) : fromPathname;
  return {
    pathname,
    search: normalizeSearch(search),
    hash: normalizeHash(hash)
  };
}
function resolvePathname(relativePath, fromPathname) {
  let segments = fromPathname.replace(/\/+$/, "").split("/");
  let relativeSegments = relativePath.split("/");
  relativeSegments.forEach((segment) => {
    if (segment === "..") {
      if (segments.length > 1) segments.pop();
    } else if (segment !== ".") {
      segments.push(segment);
    }
  });
  return segments.length > 1 ? segments.join("/") : "/";
}
function getInvalidPathError(char, field, dest, path) {
  return `Cannot include a '${char}' character in a manually specified \`to.${field}\` field [${JSON.stringify(
    path
  )}].  Please separate it out to the \`to.${dest}\` field. Alternatively you may provide the full path as a string in <Link to="..."> and the router will parse it for you.`;
}
function getPathContributingMatches(matches) {
  return matches.filter(
    (match, index) => index === 0 || match.route.path && match.route.path.length > 0
  );
}
function getResolveToMatches(matches) {
  let pathMatches = getPathContributingMatches(matches);
  return pathMatches.map(
    (match, idx) => idx === pathMatches.length - 1 ? match.pathname : match.pathnameBase
  );
}
function resolveTo(toArg, routePathnames, locationPathname, isPathRelative = false) {
  let to;
  if (typeof toArg === "string") {
    to = parsePath(toArg);
  } else {
    to = { ...toArg };
    invariant(
      !to.pathname || !to.pathname.includes("?"),
      getInvalidPathError("?", "pathname", "search", to)
    );
    invariant(
      !to.pathname || !to.pathname.includes("#"),
      getInvalidPathError("#", "pathname", "hash", to)
    );
    invariant(
      !to.search || !to.search.includes("#"),
      getInvalidPathError("#", "search", "hash", to)
    );
  }
  let isEmptyPath = toArg === "" || to.pathname === "";
  let toPathname = isEmptyPath ? "/" : to.pathname;
  let from;
  if (toPathname == null) {
    from = locationPathname;
  } else {
    let routePathnameIndex = routePathnames.length - 1;
    if (!isPathRelative && toPathname.startsWith("..")) {
      let toSegments = toPathname.split("/");
      while (toSegments[0] === "..") {
        toSegments.shift();
        routePathnameIndex -= 1;
      }
      to.pathname = toSegments.join("/");
    }
    from = routePathnameIndex >= 0 ? routePathnames[routePathnameIndex] : "/";
  }
  let path = resolvePath(to, from);
  let hasExplicitTrailingSlash = toPathname && toPathname !== "/" && toPathname.endsWith("/");
  let hasCurrentTrailingSlash = (isEmptyPath || toPathname === ".") && locationPathname.endsWith("/");
  if (!path.pathname.endsWith("/") && (hasExplicitTrailingSlash || hasCurrentTrailingSlash)) {
    path.pathname += "/";
  }
  return path;
}
var joinPaths = (paths) => paths.join("/").replace(/\/\/+/g, "/");
var normalizePathname = (pathname) => pathname.replace(/\/+$/, "").replace(/^\/*/, "/");
var normalizeSearch = (search) => !search || search === "?" ? "" : search.startsWith("?") ? search : "?" + search;
var normalizeHash = (hash) => !hash || hash === "#" ? "" : hash.startsWith("#") ? hash : "#" + hash;
function isRouteErrorResponse(error) {
  return error != null && typeof error.status === "number" && typeof error.statusText === "string" && typeof error.internal === "boolean" && "data" in error;
}
var validMutationMethodsArr = [
  "POST",
  "PUT",
  "PATCH",
  "DELETE"
];
var validMutationMethods = new Set(
  validMutationMethodsArr
);
var validRequestMethodsArr = [
  "GET",
  ...validMutationMethodsArr
];
var validRequestMethods = new Set(validRequestMethodsArr);
var ResetLoaderDataSymbol = Symbol("ResetLoaderData");
var DataRouterContext = React.createContext(null);
DataRouterContext.displayName = "DataRouter";
var DataRouterStateContext = React.createContext(null);
DataRouterStateContext.displayName = "DataRouterState";
var ViewTransitionContext = React.createContext({
  isTransitioning: false
});
ViewTransitionContext.displayName = "ViewTransition";
var FetchersContext = React.createContext(
  /* @__PURE__ */ new Map()
);
FetchersContext.displayName = "Fetchers";
var AwaitContext = React.createContext(null);
AwaitContext.displayName = "Await";
var NavigationContext = React.createContext(
  null
);
NavigationContext.displayName = "Navigation";
var LocationContext = React.createContext(
  null
);
LocationContext.displayName = "Location";
var RouteContext = React.createContext({
  outlet: null,
  matches: [],
  isDataRoute: false
});
RouteContext.displayName = "Route";
var RouteErrorContext = React.createContext(null);
RouteErrorContext.displayName = "RouteError";
var ENABLE_DEV_WARNINGS = true;
function useHref(to, { relative } = {}) {
  invariant(
    useInRouterContext(),
    // TODO: This error is probably because they somehow have 2 versions of the
    // router loaded. We can help them understand how to avoid that.
    `useHref() may be used only in the context of a <Router> component.`
  );
  let { basename, navigator: navigator2 } = React2.useContext(NavigationContext);
  let { hash, pathname, search } = useResolvedPath(to, { relative });
  let joinedPathname = pathname;
  if (basename !== "/") {
    joinedPathname = pathname === "/" ? basename : joinPaths([basename, pathname]);
  }
  return navigator2.createHref({ pathname: joinedPathname, search, hash });
}
function useInRouterContext() {
  return React2.useContext(LocationContext) != null;
}
function useLocation() {
  invariant(
    useInRouterContext(),
    // TODO: This error is probably because they somehow have 2 versions of the
    // router loaded. We can help them understand how to avoid that.
    `useLocation() may be used only in the context of a <Router> component.`
  );
  return React2.useContext(LocationContext).location;
}
var navigateEffectWarning = `You should call navigate() in a React.useEffect(), not when your component is first rendered.`;
function useIsomorphicLayoutEffect(cb) {
  let isStatic = React2.useContext(NavigationContext).static;
  if (!isStatic) {
    React2.useLayoutEffect(cb);
  }
}
function useNavigate() {
  let { isDataRoute } = React2.useContext(RouteContext);
  return isDataRoute ? useNavigateStable() : useNavigateUnstable();
}
function useNavigateUnstable() {
  invariant(
    useInRouterContext(),
    // TODO: This error is probably because they somehow have 2 versions of the
    // router loaded. We can help them understand how to avoid that.
    `useNavigate() may be used only in the context of a <Router> component.`
  );
  let dataRouterContext = React2.useContext(DataRouterContext);
  let { basename, navigator: navigator2 } = React2.useContext(NavigationContext);
  let { matches } = React2.useContext(RouteContext);
  let { pathname: locationPathname } = useLocation();
  let routePathnamesJson = JSON.stringify(getResolveToMatches(matches));
  let activeRef = React2.useRef(false);
  useIsomorphicLayoutEffect(() => {
    activeRef.current = true;
  });
  let navigate = React2.useCallback(
    (to, options = {}) => {
      warning(activeRef.current, navigateEffectWarning);
      if (!activeRef.current) return;
      if (typeof to === "number") {
        navigator2.go(to);
        return;
      }
      let path = resolveTo(
        to,
        JSON.parse(routePathnamesJson),
        locationPathname,
        options.relative === "path"
      );
      if (dataRouterContext == null && basename !== "/") {
        path.pathname = path.pathname === "/" ? basename : joinPaths([basename, path.pathname]);
      }
      (!!options.replace ? navigator2.replace : navigator2.push)(
        path,
        options.state,
        options
      );
    },
    [
      basename,
      navigator2,
      routePathnamesJson,
      locationPathname,
      dataRouterContext
    ]
  );
  return navigate;
}
var OutletContext = React2.createContext(null);
function useResolvedPath(to, { relative } = {}) {
  let { matches } = React2.useContext(RouteContext);
  let { pathname: locationPathname } = useLocation();
  let routePathnamesJson = JSON.stringify(getResolveToMatches(matches));
  return React2.useMemo(
    () => resolveTo(
      to,
      JSON.parse(routePathnamesJson),
      locationPathname,
      relative === "path"
    ),
    [to, routePathnamesJson, locationPathname, relative]
  );
}
function useRoutesImpl(routes, locationArg, dataRouterState, future) {
  invariant(
    useInRouterContext(),
    // TODO: This error is probably because they somehow have 2 versions of the
    // router loaded. We can help them understand how to avoid that.
    `useRoutes() may be used only in the context of a <Router> component.`
  );
  let { navigator: navigator2 } = React2.useContext(NavigationContext);
  let { matches: parentMatches } = React2.useContext(RouteContext);
  let routeMatch = parentMatches[parentMatches.length - 1];
  let parentParams = routeMatch ? routeMatch.params : {};
  let parentPathname = routeMatch ? routeMatch.pathname : "/";
  let parentPathnameBase = routeMatch ? routeMatch.pathnameBase : "/";
  let parentRoute = routeMatch && routeMatch.route;
  if (ENABLE_DEV_WARNINGS) {
    let parentPath = parentRoute && parentRoute.path || "";
    warningOnce(
      parentPathname,
      !parentRoute || parentPath.endsWith("*") || parentPath.endsWith("*?"),
      `You rendered descendant <Routes> (or called \`useRoutes()\`) at "${parentPathname}" (under <Route path="${parentPath}">) but the parent route path has no trailing "*". This means if you navigate deeper, the parent won't match anymore and therefore the child routes will never render.

Please change the parent <Route path="${parentPath}"> to <Route path="${parentPath === "/" ? "*" : `${parentPath}/*`}">.`
    );
  }
  let locationFromContext = useLocation();
  let location;
  if (locationArg) {
    let parsedLocationArg = typeof locationArg === "string" ? parsePath(locationArg) : locationArg;
    invariant(
      parentPathnameBase === "/" || parsedLocationArg.pathname?.startsWith(parentPathnameBase),
      `When overriding the location using \`<Routes location>\` or \`useRoutes(routes, location)\`, the location pathname must begin with the portion of the URL pathname that was matched by all parent routes. The current pathname base is "${parentPathnameBase}" but pathname "${parsedLocationArg.pathname}" was given in the \`location\` prop.`
    );
    location = parsedLocationArg;
  } else {
    location = locationFromContext;
  }
  let pathname = location.pathname || "/";
  let remainingPathname = pathname;
  if (parentPathnameBase !== "/") {
    let parentSegments = parentPathnameBase.replace(/^\//, "").split("/");
    let segments = pathname.replace(/^\//, "").split("/");
    remainingPathname = "/" + segments.slice(parentSegments.length).join("/");
  }
  let matches = matchRoutes(routes, { pathname: remainingPathname });
  if (ENABLE_DEV_WARNINGS) {
    warning(
      parentRoute || matches != null,
      `No routes matched location "${location.pathname}${location.search}${location.hash}" `
    );
    warning(
      matches == null || matches[matches.length - 1].route.element !== void 0 || matches[matches.length - 1].route.Component !== void 0 || matches[matches.length - 1].route.lazy !== void 0,
      `Matched leaf route at location "${location.pathname}${location.search}${location.hash}" does not have an element or Component. This means it will render an <Outlet /> with a null value by default resulting in an "empty" page.`
    );
  }
  let renderedMatches = _renderMatches(
    matches && matches.map(
      (match) => Object.assign({}, match, {
        params: Object.assign({}, parentParams, match.params),
        pathname: joinPaths([
          parentPathnameBase,
          // Re-encode pathnames that were decoded inside matchRoutes
          navigator2.encodeLocation ? navigator2.encodeLocation(match.pathname).pathname : match.pathname
        ]),
        pathnameBase: match.pathnameBase === "/" ? parentPathnameBase : joinPaths([
          parentPathnameBase,
          // Re-encode pathnames that were decoded inside matchRoutes
          navigator2.encodeLocation ? navigator2.encodeLocation(match.pathnameBase).pathname : match.pathnameBase
        ])
      })
    ),
    parentMatches,
    dataRouterState,
    future
  );
  if (locationArg && renderedMatches) {
    return /* @__PURE__ */ React2.createElement(
      LocationContext.Provider,
      {
        value: {
          location: {
            pathname: "/",
            search: "",
            hash: "",
            state: null,
            key: "default",
            ...location
          },
          navigationType: "POP"
          /* Pop */
        }
      },
      renderedMatches
    );
  }
  return renderedMatches;
}
function DefaultErrorComponent() {
  let error = useRouteError();
  let message = isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` : error instanceof Error ? error.message : JSON.stringify(error);
  let stack = error instanceof Error ? error.stack : null;
  let lightgrey = "rgba(200,200,200, 0.5)";
  let preStyles = { padding: "0.5rem", backgroundColor: lightgrey };
  let codeStyles = { padding: "2px 4px", backgroundColor: lightgrey };
  let devInfo = null;
  if (ENABLE_DEV_WARNINGS) {
    console.error(
      "Error handled by React Router default ErrorBoundary:",
      error
    );
    devInfo = /* @__PURE__ */ React2.createElement(React2.Fragment, null, /* @__PURE__ */ React2.createElement("p", null, "\u{1F4BF} Hey developer \u{1F44B}"), /* @__PURE__ */ React2.createElement("p", null, "You can provide a way better UX than this when your app throws errors by providing your own ", /* @__PURE__ */ React2.createElement("code", { style: codeStyles }, "ErrorBoundary"), " or", " ", /* @__PURE__ */ React2.createElement("code", { style: codeStyles }, "errorElement"), " prop on your route."));
  }
  return /* @__PURE__ */ React2.createElement(React2.Fragment, null, /* @__PURE__ */ React2.createElement("h2", null, "Unexpected Application Error!"), /* @__PURE__ */ React2.createElement("h3", { style: { fontStyle: "italic" } }, message), stack ? /* @__PURE__ */ React2.createElement("pre", { style: preStyles }, stack) : null, devInfo);
}
var defaultErrorElement = /* @__PURE__ */ React2.createElement(DefaultErrorComponent, null);
var RenderErrorBoundary = class extends React2.Component {
  constructor(props) {
    super(props);
    this.state = {
      location: props.location,
      revalidation: props.revalidation,
      error: props.error
    };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  static getDerivedStateFromProps(props, state) {
    if (state.location !== props.location || state.revalidation !== "idle" && props.revalidation === "idle") {
      return {
        error: props.error,
        location: props.location,
        revalidation: props.revalidation
      };
    }
    return {
      error: props.error !== void 0 ? props.error : state.error,
      location: state.location,
      revalidation: props.revalidation || state.revalidation
    };
  }
  componentDidCatch(error, errorInfo) {
    console.error(
      "React Router caught the following error during render",
      error,
      errorInfo
    );
  }
  render() {
    return this.state.error !== void 0 ? /* @__PURE__ */ React2.createElement(RouteContext.Provider, { value: this.props.routeContext }, /* @__PURE__ */ React2.createElement(
      RouteErrorContext.Provider,
      {
        value: this.state.error,
        children: this.props.component
      }
    )) : this.props.children;
  }
};
function RenderedRoute({ routeContext, match, children }) {
  let dataRouterContext = React2.useContext(DataRouterContext);
  if (dataRouterContext && dataRouterContext.static && dataRouterContext.staticContext && (match.route.errorElement || match.route.ErrorBoundary)) {
    dataRouterContext.staticContext._deepestRenderedBoundaryId = match.route.id;
  }
  return /* @__PURE__ */ React2.createElement(RouteContext.Provider, { value: routeContext }, children);
}
function _renderMatches(matches, parentMatches = [], dataRouterState = null, future = null) {
  if (matches == null) {
    if (!dataRouterState) {
      return null;
    }
    if (dataRouterState.errors) {
      matches = dataRouterState.matches;
    } else if (parentMatches.length === 0 && !dataRouterState.initialized && dataRouterState.matches.length > 0) {
      matches = dataRouterState.matches;
    } else {
      return null;
    }
  }
  let renderedMatches = matches;
  let errors = dataRouterState?.errors;
  if (errors != null) {
    let errorIndex = renderedMatches.findIndex(
      (m) => m.route.id && errors?.[m.route.id] !== void 0
    );
    invariant(
      errorIndex >= 0,
      `Could not find a matching route for errors on route IDs: ${Object.keys(
        errors
      ).join(",")}`
    );
    renderedMatches = renderedMatches.slice(
      0,
      Math.min(renderedMatches.length, errorIndex + 1)
    );
  }
  let renderFallback = false;
  let fallbackIndex = -1;
  if (dataRouterState) {
    for (let i = 0; i < renderedMatches.length; i++) {
      let match = renderedMatches[i];
      if (match.route.HydrateFallback || match.route.hydrateFallbackElement) {
        fallbackIndex = i;
      }
      if (match.route.id) {
        let { loaderData, errors: errors2 } = dataRouterState;
        let needsToRunLoader = match.route.loader && !loaderData.hasOwnProperty(match.route.id) && (!errors2 || errors2[match.route.id] === void 0);
        if (match.route.lazy || needsToRunLoader) {
          renderFallback = true;
          if (fallbackIndex >= 0) {
            renderedMatches = renderedMatches.slice(0, fallbackIndex + 1);
          } else {
            renderedMatches = [renderedMatches[0]];
          }
          break;
        }
      }
    }
  }
  return renderedMatches.reduceRight((outlet, match, index) => {
    let error;
    let shouldRenderHydrateFallback = false;
    let errorElement = null;
    let hydrateFallbackElement = null;
    if (dataRouterState) {
      error = errors && match.route.id ? errors[match.route.id] : void 0;
      errorElement = match.route.errorElement || defaultErrorElement;
      if (renderFallback) {
        if (fallbackIndex < 0 && index === 0) {
          warningOnce(
            "route-fallback",
            false,
            "No `HydrateFallback` element provided to render during initial hydration"
          );
          shouldRenderHydrateFallback = true;
          hydrateFallbackElement = null;
        } else if (fallbackIndex === index) {
          shouldRenderHydrateFallback = true;
          hydrateFallbackElement = match.route.hydrateFallbackElement || null;
        }
      }
    }
    let matches2 = parentMatches.concat(renderedMatches.slice(0, index + 1));
    let getChildren = () => {
      let children;
      if (error) {
        children = errorElement;
      } else if (shouldRenderHydrateFallback) {
        children = hydrateFallbackElement;
      } else if (match.route.Component) {
        children = /* @__PURE__ */ React2.createElement(match.route.Component, null);
      } else if (match.route.element) {
        children = match.route.element;
      } else {
        children = outlet;
      }
      return /* @__PURE__ */ React2.createElement(
        RenderedRoute,
        {
          match,
          routeContext: {
            outlet,
            matches: matches2,
            isDataRoute: dataRouterState != null
          },
          children
        }
      );
    };
    return dataRouterState && (match.route.ErrorBoundary || match.route.errorElement || index === 0) ? /* @__PURE__ */ React2.createElement(
      RenderErrorBoundary,
      {
        location: dataRouterState.location,
        revalidation: dataRouterState.revalidation,
        component: errorElement,
        error,
        children: getChildren(),
        routeContext: { outlet: null, matches: matches2, isDataRoute: true }
      }
    ) : getChildren();
  }, null);
}
function getDataRouterConsoleError(hookName) {
  return `${hookName} must be used within a data router.  See https://reactrouter.com/en/main/routers/picking-a-router.`;
}
function useDataRouterContext(hookName) {
  let ctx = React2.useContext(DataRouterContext);
  invariant(ctx, getDataRouterConsoleError(hookName));
  return ctx;
}
function useDataRouterState(hookName) {
  let state = React2.useContext(DataRouterStateContext);
  invariant(state, getDataRouterConsoleError(hookName));
  return state;
}
function useRouteContext(hookName) {
  let route = React2.useContext(RouteContext);
  invariant(route, getDataRouterConsoleError(hookName));
  return route;
}
function useCurrentRouteId(hookName) {
  let route = useRouteContext(hookName);
  let thisRoute = route.matches[route.matches.length - 1];
  invariant(
    thisRoute.route.id,
    `${hookName} can only be used on routes that contain a unique "id"`
  );
  return thisRoute.route.id;
}
function useRouteId() {
  return useCurrentRouteId(
    "useRouteId"
    /* UseRouteId */
  );
}
function useNavigation() {
  let state = useDataRouterState(
    "useNavigation"
    /* UseNavigation */
  );
  return state.navigation;
}
function useMatches() {
  let { matches, loaderData } = useDataRouterState(
    "useMatches"
    /* UseMatches */
  );
  return React2.useMemo(
    () => matches.map((m) => convertRouteMatchToUiMatch(m, loaderData)),
    [matches, loaderData]
  );
}
function useRouteError() {
  let error = React2.useContext(RouteErrorContext);
  let state = useDataRouterState(
    "useRouteError"
    /* UseRouteError */
  );
  let routeId = useCurrentRouteId(
    "useRouteError"
    /* UseRouteError */
  );
  if (error !== void 0) {
    return error;
  }
  return state.errors?.[routeId];
}
function useNavigateStable() {
  let { router } = useDataRouterContext(
    "useNavigate"
    /* UseNavigateStable */
  );
  let id = useCurrentRouteId(
    "useNavigate"
    /* UseNavigateStable */
  );
  let activeRef = React2.useRef(false);
  useIsomorphicLayoutEffect(() => {
    activeRef.current = true;
  });
  let navigate = React2.useCallback(
    async (to, options = {}) => {
      warning(activeRef.current, navigateEffectWarning);
      if (!activeRef.current) return;
      if (typeof to === "number") {
        router.navigate(to);
      } else {
        await router.navigate(to, { fromRouteId: id, ...options });
      }
    },
    [router, id]
  );
  return navigate;
}
var alreadyWarned = {};
function warningOnce(key, cond, message) {
  if (!cond && !alreadyWarned[key]) {
    alreadyWarned[key] = true;
    warning(false, message);
  }
}
var MemoizedDataRoutes = React3.memo(DataRoutes);
function DataRoutes({
  routes,
  future,
  state
}) {
  return useRoutesImpl(routes, void 0, state, future);
}
function Router({
  basename: basenameProp = "/",
  children = null,
  location: locationProp,
  navigationType = "POP",
  navigator: navigator2,
  static: staticProp = false
}) {
  invariant(
    !useInRouterContext(),
    `You cannot render a <Router> inside another <Router>. You should never have more than one in your app.`
  );
  let basename = basenameProp.replace(/^\/*/, "/");
  let navigationContext = React3.useMemo(
    () => ({
      basename,
      navigator: navigator2,
      static: staticProp,
      future: {}
    }),
    [basename, navigator2, staticProp]
  );
  if (typeof locationProp === "string") {
    locationProp = parsePath(locationProp);
  }
  let {
    pathname = "/",
    search = "",
    hash = "",
    state = null,
    key = "default"
  } = locationProp;
  let locationContext = React3.useMemo(() => {
    let trailingPathname = stripBasename(pathname, basename);
    if (trailingPathname == null) {
      return null;
    }
    return {
      location: {
        pathname: trailingPathname,
        search,
        hash,
        state,
        key
      },
      navigationType
    };
  }, [basename, pathname, search, hash, state, key, navigationType]);
  warning(
    locationContext != null,
    `<Router basename="${basename}"> is not able to match the URL "${pathname}${search}${hash}" because it does not start with the basename, so the <Router> won't render anything.`
  );
  if (locationContext == null) {
    return null;
  }
  return /* @__PURE__ */ React3.createElement(NavigationContext.Provider, { value: navigationContext }, /* @__PURE__ */ React3.createElement(LocationContext.Provider, { children, value: locationContext }));
}
var defaultMethod = "get";
var defaultEncType = "application/x-www-form-urlencoded";
function isHtmlElement(object) {
  return object != null && typeof object.tagName === "string";
}
function isButtonElement(object) {
  return isHtmlElement(object) && object.tagName.toLowerCase() === "button";
}
function isFormElement(object) {
  return isHtmlElement(object) && object.tagName.toLowerCase() === "form";
}
function isInputElement(object) {
  return isHtmlElement(object) && object.tagName.toLowerCase() === "input";
}
function isModifiedEvent(event) {
  return !!(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey);
}
function shouldProcessLinkClick(event, target) {
  return event.button === 0 && // Ignore everything but left clicks
  (!target || target === "_self") && // Let browser handle "target=_blank" etc.
  !isModifiedEvent(event);
}
var _formDataSupportsSubmitter = null;
function isFormDataSubmitterSupported() {
  if (_formDataSupportsSubmitter === null) {
    try {
      new FormData(
        document.createElement("form"),
        // @ts-expect-error if FormData supports the submitter parameter, this will throw
        0
      );
      _formDataSupportsSubmitter = false;
    } catch (e) {
      _formDataSupportsSubmitter = true;
    }
  }
  return _formDataSupportsSubmitter;
}
var supportedFormEncTypes = /* @__PURE__ */ new Set([
  "application/x-www-form-urlencoded",
  "multipart/form-data",
  "text/plain"
]);
function getFormEncType(encType) {
  if (encType != null && !supportedFormEncTypes.has(encType)) {
    warning(
      false,
      `"${encType}" is not a valid \`encType\` for \`<Form>\`/\`<fetcher.Form>\` and will default to "${defaultEncType}"`
    );
    return null;
  }
  return encType;
}
function getFormSubmissionInfo(target, basename) {
  let method;
  let action;
  let encType;
  let formData;
  let body;
  if (isFormElement(target)) {
    let attr = target.getAttribute("action");
    action = attr ? stripBasename(attr, basename) : null;
    method = target.getAttribute("method") || defaultMethod;
    encType = getFormEncType(target.getAttribute("enctype")) || defaultEncType;
    formData = new FormData(target);
  } else if (isButtonElement(target) || isInputElement(target) && (target.type === "submit" || target.type === "image")) {
    let form = target.form;
    if (form == null) {
      throw new Error(
        `Cannot submit a <button> or <input type="submit"> without a <form>`
      );
    }
    let attr = target.getAttribute("formaction") || form.getAttribute("action");
    action = attr ? stripBasename(attr, basename) : null;
    method = target.getAttribute("formmethod") || form.getAttribute("method") || defaultMethod;
    encType = getFormEncType(target.getAttribute("formenctype")) || getFormEncType(form.getAttribute("enctype")) || defaultEncType;
    formData = new FormData(form, target);
    if (!isFormDataSubmitterSupported()) {
      let { name, type, value } = target;
      if (type === "image") {
        let prefix = name ? `${name}.` : "";
        formData.append(`${prefix}x`, "0");
        formData.append(`${prefix}y`, "0");
      } else if (name) {
        formData.append(name, value);
      }
    }
  } else if (isHtmlElement(target)) {
    throw new Error(
      `Cannot submit element that is not <form>, <button>, or <input type="submit|image">`
    );
  } else {
    method = defaultMethod;
    action = null;
    encType = defaultEncType;
    body = target;
  }
  if (formData && encType === "text/plain") {
    body = formData;
    formData = void 0;
  }
  return { action, method: method.toLowerCase(), encType, formData, body };
}
function invariant2(value, message) {
  if (value === false || value === null || typeof value === "undefined") {
    throw new Error(message);
  }
}
async function loadRouteModule(route, routeModulesCache) {
  if (route.id in routeModulesCache) {
    return routeModulesCache[route.id];
  }
  try {
    let routeModule = await import(
      /* @vite-ignore */
      /* webpackIgnore: true */
      route.module
    );
    routeModulesCache[route.id] = routeModule;
    return routeModule;
  } catch (error) {
    console.error(
      `Error loading route module \`${route.module}\`, reloading page...`
    );
    console.error(error);
    if (window.__reactRouterContext && window.__reactRouterContext.isSpaMode && // @ts-expect-error
    import.meta.hot) {
      throw error;
    }
    window.location.reload();
    return new Promise(() => {
    });
  }
}
function isPageLinkDescriptor(object) {
  return object != null && typeof object.page === "string";
}
function isHtmlLinkDescriptor(object) {
  if (object == null) {
    return false;
  }
  if (object.href == null) {
    return object.rel === "preload" && typeof object.imageSrcSet === "string" && typeof object.imageSizes === "string";
  }
  return typeof object.rel === "string" && typeof object.href === "string";
}
async function getKeyedPrefetchLinks(matches, manifest, routeModules) {
  let links = await Promise.all(
    matches.map(async (match) => {
      let route = manifest.routes[match.route.id];
      if (route) {
        let mod = await loadRouteModule(route, routeModules);
        return mod.links ? mod.links() : [];
      }
      return [];
    })
  );
  return dedupeLinkDescriptors(
    links.flat(1).filter(isHtmlLinkDescriptor).filter((link) => link.rel === "stylesheet" || link.rel === "preload").map(
      (link) => link.rel === "stylesheet" ? { ...link, rel: "prefetch", as: "style" } : { ...link, rel: "prefetch" }
    )
  );
}
function getNewMatchesForLinks(page, nextMatches, currentMatches, manifest, location, mode) {
  let isNew = (match, index) => {
    if (!currentMatches[index]) return true;
    return match.route.id !== currentMatches[index].route.id;
  };
  let matchPathChanged = (match, index) => {
    return (
      // param change, /users/123 -> /users/456
      currentMatches[index].pathname !== match.pathname || // splat param changed, which is not present in match.path
      // e.g. /files/images/avatar.jpg -> files/finances.xls
      currentMatches[index].route.path?.endsWith("*") && currentMatches[index].params["*"] !== match.params["*"]
    );
  };
  if (mode === "assets") {
    return nextMatches.filter(
      (match, index) => isNew(match, index) || matchPathChanged(match, index)
    );
  }
  if (mode === "data") {
    return nextMatches.filter((match, index) => {
      let manifestRoute = manifest.routes[match.route.id];
      if (!manifestRoute || !manifestRoute.hasLoader) {
        return false;
      }
      if (isNew(match, index) || matchPathChanged(match, index)) {
        return true;
      }
      if (match.route.shouldRevalidate) {
        let routeChoice = match.route.shouldRevalidate({
          currentUrl: new URL(
            location.pathname + location.search + location.hash,
            window.origin
          ),
          currentParams: currentMatches[0]?.params || {},
          nextUrl: new URL(page, window.origin),
          nextParams: match.params,
          defaultShouldRevalidate: true
        });
        if (typeof routeChoice === "boolean") {
          return routeChoice;
        }
      }
      return true;
    });
  }
  return [];
}
function getModuleLinkHrefs(matches, manifestPatch) {
  return dedupeHrefs(
    matches.map((match) => {
      let route = manifestPatch.routes[match.route.id];
      if (!route) return [];
      let hrefs = [route.module];
      if (route.imports) {
        hrefs = hrefs.concat(route.imports);
      }
      return hrefs;
    }).flat(1)
  );
}
function dedupeHrefs(hrefs) {
  return [...new Set(hrefs)];
}
function sortKeys(obj) {
  let sorted = {};
  let keys = Object.keys(obj).sort();
  for (let key of keys) {
    sorted[key] = obj[key];
  }
  return sorted;
}
function dedupeLinkDescriptors(descriptors, preloads) {
  let set = /* @__PURE__ */ new Set();
  let preloadsSet = new Set(preloads);
  return descriptors.reduce((deduped, descriptor) => {
    let alreadyModulePreload = preloads && !isPageLinkDescriptor(descriptor) && descriptor.as === "script" && descriptor.href && preloadsSet.has(descriptor.href);
    if (alreadyModulePreload) {
      return deduped;
    }
    let key = JSON.stringify(sortKeys(descriptor));
    if (!set.has(key)) {
      set.add(key);
      deduped.push({ key, link: descriptor });
    }
    return deduped;
  }, []);
}
var SingleFetchRedirectSymbol = Symbol("SingleFetchRedirect");
function singleFetchUrl(reqUrl) {
  let url = typeof reqUrl === "string" ? new URL(
    reqUrl,
    // This can be called during the SSR flow via PrefetchPageLinksImpl so
    // don't assume window is available
    typeof window === "undefined" ? "server://singlefetch/" : window.location.origin
  ) : reqUrl;
  if (url.pathname === "/") {
    url.pathname = "_root.data";
  } else {
    url.pathname = `${url.pathname.replace(/\/$/, "")}.data`;
  }
  return url;
}
function useDataRouterContext2() {
  let context = React9.useContext(DataRouterContext);
  invariant2(
    context,
    "You must render this element inside a <DataRouterContext.Provider> element"
  );
  return context;
}
function useDataRouterStateContext() {
  let context = React9.useContext(DataRouterStateContext);
  invariant2(
    context,
    "You must render this element inside a <DataRouterStateContext.Provider> element"
  );
  return context;
}
var FrameworkContext = React9.createContext(void 0);
FrameworkContext.displayName = "FrameworkContext";
function useFrameworkContext() {
  let context = React9.useContext(FrameworkContext);
  invariant2(
    context,
    "You must render this element inside a <HydratedRouter> element"
  );
  return context;
}
function usePrefetchBehavior(prefetch, theirElementProps) {
  let frameworkContext = React9.useContext(FrameworkContext);
  let [maybePrefetch, setMaybePrefetch] = React9.useState(false);
  let [shouldPrefetch, setShouldPrefetch] = React9.useState(false);
  let { onFocus, onBlur, onMouseEnter, onMouseLeave, onTouchStart } = theirElementProps;
  let ref = React9.useRef(null);
  React9.useEffect(() => {
    if (prefetch === "render") {
      setShouldPrefetch(true);
    }
    if (prefetch === "viewport") {
      let callback = (entries) => {
        entries.forEach((entry) => {
          setShouldPrefetch(entry.isIntersecting);
        });
      };
      let observer = new IntersectionObserver(callback, { threshold: 0.5 });
      if (ref.current) observer.observe(ref.current);
      return () => {
        observer.disconnect();
      };
    }
  }, [prefetch]);
  React9.useEffect(() => {
    if (maybePrefetch) {
      let id = setTimeout(() => {
        setShouldPrefetch(true);
      }, 100);
      return () => {
        clearTimeout(id);
      };
    }
  }, [maybePrefetch]);
  let setIntent = () => {
    setMaybePrefetch(true);
  };
  let cancelIntent = () => {
    setMaybePrefetch(false);
    setShouldPrefetch(false);
  };
  if (!frameworkContext) {
    return [false, ref, {}];
  }
  if (prefetch !== "intent") {
    return [shouldPrefetch, ref, {}];
  }
  return [
    shouldPrefetch,
    ref,
    {
      onFocus: composeEventHandlers(onFocus, setIntent),
      onBlur: composeEventHandlers(onBlur, cancelIntent),
      onMouseEnter: composeEventHandlers(onMouseEnter, setIntent),
      onMouseLeave: composeEventHandlers(onMouseLeave, cancelIntent),
      onTouchStart: composeEventHandlers(onTouchStart, setIntent)
    }
  ];
}
function composeEventHandlers(theirHandler, ourHandler) {
  return (event) => {
    theirHandler && theirHandler(event);
    if (!event.defaultPrevented) {
      ourHandler(event);
    }
  };
}
function PrefetchPageLinks({
  page,
  ...dataLinkProps
}) {
  let { router } = useDataRouterContext2();
  let matches = React9.useMemo(
    () => matchRoutes(router.routes, page, router.basename),
    [router.routes, page, router.basename]
  );
  if (!matches) {
    return null;
  }
  return /* @__PURE__ */ React9.createElement(PrefetchPageLinksImpl, { page, matches, ...dataLinkProps });
}
function useKeyedPrefetchLinks(matches) {
  let { manifest, routeModules } = useFrameworkContext();
  let [keyedPrefetchLinks, setKeyedPrefetchLinks] = React9.useState([]);
  React9.useEffect(() => {
    let interrupted = false;
    void getKeyedPrefetchLinks(matches, manifest, routeModules).then(
      (links) => {
        if (!interrupted) {
          setKeyedPrefetchLinks(links);
        }
      }
    );
    return () => {
      interrupted = true;
    };
  }, [matches, manifest, routeModules]);
  return keyedPrefetchLinks;
}
function PrefetchPageLinksImpl({
  page,
  matches: nextMatches,
  ...linkProps
}) {
  let location = useLocation();
  let { manifest, routeModules } = useFrameworkContext();
  let { loaderData, matches } = useDataRouterStateContext();
  let newMatchesForData = React9.useMemo(
    () => getNewMatchesForLinks(
      page,
      nextMatches,
      matches,
      manifest,
      location,
      "data"
    ),
    [page, nextMatches, matches, manifest, location]
  );
  let newMatchesForAssets = React9.useMemo(
    () => getNewMatchesForLinks(
      page,
      nextMatches,
      matches,
      manifest,
      location,
      "assets"
    ),
    [page, nextMatches, matches, manifest, location]
  );
  let dataHrefs = React9.useMemo(() => {
    if (page === location.pathname + location.search + location.hash) {
      return [];
    }
    let routesParams = /* @__PURE__ */ new Set();
    let foundOptOutRoute = false;
    nextMatches.forEach((m) => {
      let manifestRoute = manifest.routes[m.route.id];
      if (!manifestRoute || !manifestRoute.hasLoader) {
        return;
      }
      if (!newMatchesForData.some((m2) => m2.route.id === m.route.id) && m.route.id in loaderData && routeModules[m.route.id]?.shouldRevalidate) {
        foundOptOutRoute = true;
      } else if (manifestRoute.hasClientLoader) {
        foundOptOutRoute = true;
      } else {
        routesParams.add(m.route.id);
      }
    });
    if (routesParams.size === 0) {
      return [];
    }
    let url = singleFetchUrl(page);
    if (foundOptOutRoute && routesParams.size > 0) {
      url.searchParams.set(
        "_routes",
        nextMatches.filter((m) => routesParams.has(m.route.id)).map((m) => m.route.id).join(",")
      );
    }
    return [url.pathname + url.search];
  }, [
    loaderData,
    location,
    manifest,
    newMatchesForData,
    nextMatches,
    page,
    routeModules
  ]);
  let moduleHrefs = React9.useMemo(
    () => getModuleLinkHrefs(newMatchesForAssets, manifest),
    [newMatchesForAssets, manifest]
  );
  let keyedPrefetchLinks = useKeyedPrefetchLinks(newMatchesForAssets);
  return /* @__PURE__ */ React9.createElement(React9.Fragment, null, dataHrefs.map((href) => /* @__PURE__ */ React9.createElement("link", { key: href, rel: "prefetch", as: "fetch", href, ...linkProps })), moduleHrefs.map((href) => /* @__PURE__ */ React9.createElement("link", { key: href, rel: "modulepreload", href, ...linkProps })), keyedPrefetchLinks.map(({ key, link }) => (
    // these don't spread `linkProps` because they are full link descriptors
    // already with their own props
    /* @__PURE__ */ React9.createElement("link", { key, ...link })
  )));
}
function mergeRefs(...refs) {
  return (value) => {
    refs.forEach((ref) => {
      if (typeof ref === "function") {
        ref(value);
      } else if (ref != null) {
        ref.current = value;
      }
    });
  };
}
var isBrowser = typeof window !== "undefined" && typeof window.document !== "undefined" && typeof window.document.createElement !== "undefined";
try {
  if (isBrowser) {
    window.__reactRouterVersion = "7.1.1";
  }
} catch (e) {
}
function HistoryRouter({
  basename,
  children,
  history
}) {
  let [state, setStateImpl] = React10.useState({
    action: history.action,
    location: history.location
  });
  let setState = React10.useCallback(
    (newState) => {
      React10.startTransition(() => setStateImpl(newState));
    },
    [setStateImpl]
  );
  React10.useLayoutEffect(() => history.listen(setState), [history, setState]);
  return /* @__PURE__ */ React10.createElement(
    Router,
    {
      basename,
      children,
      location: state.location,
      navigationType: state.action,
      navigator: history
    }
  );
}
HistoryRouter.displayName = "unstable_HistoryRouter";
var ABSOLUTE_URL_REGEX2 = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;
var Link = React10.forwardRef(
  function LinkWithRef({
    onClick,
    discover = "render",
    prefetch = "none",
    relative,
    reloadDocument,
    replace: replace2,
    state,
    target,
    to,
    preventScrollReset,
    viewTransition,
    ...rest
  }, forwardedRef) {
    let { basename } = React10.useContext(NavigationContext);
    let isAbsolute = typeof to === "string" && ABSOLUTE_URL_REGEX2.test(to);
    let absoluteHref;
    let isExternal = false;
    if (typeof to === "string" && isAbsolute) {
      absoluteHref = to;
      if (isBrowser) {
        try {
          let currentUrl = new URL(window.location.href);
          let targetUrl = to.startsWith("//") ? new URL(currentUrl.protocol + to) : new URL(to);
          let path = stripBasename(targetUrl.pathname, basename);
          if (targetUrl.origin === currentUrl.origin && path != null) {
            to = path + targetUrl.search + targetUrl.hash;
          } else {
            isExternal = true;
          }
        } catch (e) {
          warning(
            false,
            `<Link to="${to}"> contains an invalid URL which will probably break when clicked - please update to a valid URL path.`
          );
        }
      }
    }
    let href = useHref(to, { relative });
    let [shouldPrefetch, prefetchRef, prefetchHandlers] = usePrefetchBehavior(
      prefetch,
      rest
    );
    let internalOnClick = useLinkClickHandler(to, {
      replace: replace2,
      state,
      target,
      preventScrollReset,
      relative,
      viewTransition
    });
    function handleClick(event) {
      if (onClick) onClick(event);
      if (!event.defaultPrevented) {
        internalOnClick(event);
      }
    }
    let link = (
      // eslint-disable-next-line jsx-a11y/anchor-has-content
      /* @__PURE__ */ React10.createElement(
        "a",
        {
          ...rest,
          ...prefetchHandlers,
          href: absoluteHref || href,
          onClick: isExternal || reloadDocument ? onClick : handleClick,
          ref: mergeRefs(forwardedRef, prefetchRef),
          target,
          "data-discover": !isAbsolute && discover === "render" ? "true" : void 0
        }
      )
    );
    return shouldPrefetch && !isAbsolute ? /* @__PURE__ */ React10.createElement(React10.Fragment, null, link, /* @__PURE__ */ React10.createElement(PrefetchPageLinks, { page: href })) : link;
  }
);
Link.displayName = "Link";
var NavLink = React10.forwardRef(
  function NavLinkWithRef({
    "aria-current": ariaCurrentProp = "page",
    caseSensitive = false,
    className: classNameProp = "",
    end = false,
    style: styleProp,
    to,
    viewTransition,
    children,
    ...rest
  }, ref) {
    let path = useResolvedPath(to, { relative: rest.relative });
    let location = useLocation();
    let routerState = React10.useContext(DataRouterStateContext);
    let { navigator: navigator2, basename } = React10.useContext(NavigationContext);
    let isTransitioning = routerState != null && // Conditional usage is OK here because the usage of a data router is static
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useViewTransitionState(path) && viewTransition === true;
    let toPathname = navigator2.encodeLocation ? navigator2.encodeLocation(path).pathname : path.pathname;
    let locationPathname = location.pathname;
    let nextLocationPathname = routerState && routerState.navigation && routerState.navigation.location ? routerState.navigation.location.pathname : null;
    if (!caseSensitive) {
      locationPathname = locationPathname.toLowerCase();
      nextLocationPathname = nextLocationPathname ? nextLocationPathname.toLowerCase() : null;
      toPathname = toPathname.toLowerCase();
    }
    if (nextLocationPathname && basename) {
      nextLocationPathname = stripBasename(nextLocationPathname, basename) || nextLocationPathname;
    }
    const endSlashPosition = toPathname !== "/" && toPathname.endsWith("/") ? toPathname.length - 1 : toPathname.length;
    let isActive = locationPathname === toPathname || !end && locationPathname.startsWith(toPathname) && locationPathname.charAt(endSlashPosition) === "/";
    let isPending = nextLocationPathname != null && (nextLocationPathname === toPathname || !end && nextLocationPathname.startsWith(toPathname) && nextLocationPathname.charAt(toPathname.length) === "/");
    let renderProps = {
      isActive,
      isPending,
      isTransitioning
    };
    let ariaCurrent = isActive ? ariaCurrentProp : void 0;
    let className;
    if (typeof classNameProp === "function") {
      className = classNameProp(renderProps);
    } else {
      className = [
        classNameProp,
        isActive ? "active" : null,
        isPending ? "pending" : null,
        isTransitioning ? "transitioning" : null
      ].filter(Boolean).join(" ");
    }
    let style = typeof styleProp === "function" ? styleProp(renderProps) : styleProp;
    return /* @__PURE__ */ React10.createElement(
      Link,
      {
        ...rest,
        "aria-current": ariaCurrent,
        className,
        ref,
        style,
        to,
        viewTransition
      },
      typeof children === "function" ? children(renderProps) : children
    );
  }
);
NavLink.displayName = "NavLink";
var Form = React10.forwardRef(
  ({
    discover = "render",
    fetcherKey,
    navigate,
    reloadDocument,
    replace: replace2,
    state,
    method = defaultMethod,
    action,
    onSubmit,
    relative,
    preventScrollReset,
    viewTransition,
    ...props
  }, forwardedRef) => {
    let submit = useSubmit();
    let formAction = useFormAction(action, { relative });
    let formMethod = method.toLowerCase() === "get" ? "get" : "post";
    let isAbsolute = typeof action === "string" && ABSOLUTE_URL_REGEX2.test(action);
    let submitHandler = (event) => {
      onSubmit && onSubmit(event);
      if (event.defaultPrevented) return;
      event.preventDefault();
      let submitter = event.nativeEvent.submitter;
      let submitMethod = submitter?.getAttribute("formmethod") || method;
      submit(submitter || event.currentTarget, {
        fetcherKey,
        method: submitMethod,
        navigate,
        replace: replace2,
        state,
        relative,
        preventScrollReset,
        viewTransition
      });
    };
    return /* @__PURE__ */ React10.createElement(
      "form",
      {
        ref: forwardedRef,
        method: formMethod,
        action: formAction,
        onSubmit: reloadDocument ? onSubmit : submitHandler,
        ...props,
        "data-discover": !isAbsolute && discover === "render" ? "true" : void 0
      }
    );
  }
);
Form.displayName = "Form";
function ScrollRestoration({
  getKey,
  storageKey,
  ...props
}) {
  let remixContext = React10.useContext(FrameworkContext);
  let { basename } = React10.useContext(NavigationContext);
  let location = useLocation();
  let matches = useMatches();
  useScrollRestoration({ getKey, storageKey });
  let ssrKey = React10.useMemo(
    () => {
      if (!remixContext || !getKey) return null;
      let userKey = getScrollRestorationKey(
        location,
        matches,
        basename,
        getKey
      );
      return userKey !== location.key ? userKey : null;
    },
    // Nah, we only need this the first time for the SSR render
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  if (!remixContext || remixContext.isSpaMode) {
    return null;
  }
  let restoreScroll = ((storageKey2, restoreKey) => {
    if (!window.history.state || !window.history.state.key) {
      let key = Math.random().toString(32).slice(2);
      window.history.replaceState({ key }, "");
    }
    try {
      let positions = JSON.parse(sessionStorage.getItem(storageKey2) || "{}");
      let storedY = positions[restoreKey || window.history.state.key];
      if (typeof storedY === "number") {
        window.scrollTo(0, storedY);
      }
    } catch (error) {
      console.error(error);
      sessionStorage.removeItem(storageKey2);
    }
  }).toString();
  return /* @__PURE__ */ React10.createElement(
    "script",
    {
      ...props,
      suppressHydrationWarning: true,
      dangerouslySetInnerHTML: {
        __html: `(${restoreScroll})(${JSON.stringify(
          storageKey || SCROLL_RESTORATION_STORAGE_KEY
        )}, ${JSON.stringify(ssrKey)})`
      }
    }
  );
}
ScrollRestoration.displayName = "ScrollRestoration";
function getDataRouterConsoleError2(hookName) {
  return `${hookName} must be used within a data router.  See https://reactrouter.com/en/main/routers/picking-a-router.`;
}
function useDataRouterContext3(hookName) {
  let ctx = React10.useContext(DataRouterContext);
  invariant(ctx, getDataRouterConsoleError2(hookName));
  return ctx;
}
function useDataRouterState2(hookName) {
  let state = React10.useContext(DataRouterStateContext);
  invariant(state, getDataRouterConsoleError2(hookName));
  return state;
}
function useLinkClickHandler(to, {
  target,
  replace: replaceProp,
  state,
  preventScrollReset,
  relative,
  viewTransition
} = {}) {
  let navigate = useNavigate();
  let location = useLocation();
  let path = useResolvedPath(to, { relative });
  return React10.useCallback(
    (event) => {
      if (shouldProcessLinkClick(event, target)) {
        event.preventDefault();
        let replace2 = replaceProp !== void 0 ? replaceProp : createPath(location) === createPath(path);
        navigate(to, {
          replace: replace2,
          state,
          preventScrollReset,
          relative,
          viewTransition
        });
      }
    },
    [
      location,
      navigate,
      path,
      replaceProp,
      state,
      target,
      to,
      preventScrollReset,
      relative,
      viewTransition
    ]
  );
}
var fetcherId = 0;
var getUniqueFetcherId = () => `__${String(++fetcherId)}__`;
function useSubmit() {
  let { router } = useDataRouterContext3(
    "useSubmit"
    /* UseSubmit */
  );
  let { basename } = React10.useContext(NavigationContext);
  let currentRouteId = useRouteId();
  return React10.useCallback(
    async (target, options = {}) => {
      let { action, method, encType, formData, body } = getFormSubmissionInfo(
        target,
        basename
      );
      if (options.navigate === false) {
        let key = options.fetcherKey || getUniqueFetcherId();
        await router.fetch(key, currentRouteId, options.action || action, {
          preventScrollReset: options.preventScrollReset,
          formData,
          body,
          formMethod: options.method || method,
          formEncType: options.encType || encType,
          flushSync: options.flushSync
        });
      } else {
        await router.navigate(options.action || action, {
          preventScrollReset: options.preventScrollReset,
          formData,
          body,
          formMethod: options.method || method,
          formEncType: options.encType || encType,
          replace: options.replace,
          state: options.state,
          fromRouteId: currentRouteId,
          flushSync: options.flushSync,
          viewTransition: options.viewTransition
        });
      }
    },
    [router, basename, currentRouteId]
  );
}
function useFormAction(action, { relative } = {}) {
  let { basename } = React10.useContext(NavigationContext);
  let routeContext = React10.useContext(RouteContext);
  invariant(routeContext, "useFormAction must be used inside a RouteContext");
  let [match] = routeContext.matches.slice(-1);
  let path = { ...useResolvedPath(action ? action : ".", { relative }) };
  let location = useLocation();
  if (action == null) {
    path.search = location.search;
    let params = new URLSearchParams(path.search);
    let indexValues = params.getAll("index");
    let hasNakedIndexParam = indexValues.some((v) => v === "");
    if (hasNakedIndexParam) {
      params.delete("index");
      indexValues.filter((v) => v).forEach((v) => params.append("index", v));
      let qs = params.toString();
      path.search = qs ? `?${qs}` : "";
    }
  }
  if ((!action || action === ".") && match.route.index) {
    path.search = path.search ? path.search.replace(/^\?/, "?index&") : "?index";
  }
  if (basename !== "/") {
    path.pathname = path.pathname === "/" ? basename : joinPaths([basename, path.pathname]);
  }
  return createPath(path);
}
var SCROLL_RESTORATION_STORAGE_KEY = "react-router-scroll-positions";
var savedScrollPositions = {};
function getScrollRestorationKey(location, matches, basename, getKey) {
  let key = null;
  if (getKey) {
    if (basename !== "/") {
      key = getKey(
        {
          ...location,
          pathname: stripBasename(location.pathname, basename) || location.pathname
        },
        matches
      );
    } else {
      key = getKey(location, matches);
    }
  }
  if (key == null) {
    key = location.key;
  }
  return key;
}
function useScrollRestoration({
  getKey,
  storageKey
} = {}) {
  let { router } = useDataRouterContext3(
    "useScrollRestoration"
    /* UseScrollRestoration */
  );
  let { restoreScrollPosition, preventScrollReset } = useDataRouterState2(
    "useScrollRestoration"
    /* UseScrollRestoration */
  );
  let { basename } = React10.useContext(NavigationContext);
  let location = useLocation();
  let matches = useMatches();
  let navigation = useNavigation();
  React10.useEffect(() => {
    window.history.scrollRestoration = "manual";
    return () => {
      window.history.scrollRestoration = "auto";
    };
  }, []);
  usePageHide(
    React10.useCallback(() => {
      if (navigation.state === "idle") {
        let key = getScrollRestorationKey(location, matches, basename, getKey);
        savedScrollPositions[key] = window.scrollY;
      }
      try {
        sessionStorage.setItem(
          storageKey || SCROLL_RESTORATION_STORAGE_KEY,
          JSON.stringify(savedScrollPositions)
        );
      } catch (error) {
        warning(
          false,
          `Failed to save scroll positions in sessionStorage, <ScrollRestoration /> will not work properly (${error}).`
        );
      }
      window.history.scrollRestoration = "auto";
    }, [navigation.state, getKey, basename, location, matches, storageKey])
  );
  if (typeof document !== "undefined") {
    React10.useLayoutEffect(() => {
      try {
        let sessionPositions = sessionStorage.getItem(
          storageKey || SCROLL_RESTORATION_STORAGE_KEY
        );
        if (sessionPositions) {
          savedScrollPositions = JSON.parse(sessionPositions);
        }
      } catch (e) {
      }
    }, [storageKey]);
    React10.useLayoutEffect(() => {
      let disableScrollRestoration = router?.enableScrollRestoration(
        savedScrollPositions,
        () => window.scrollY,
        getKey ? (location2, matches2) => getScrollRestorationKey(location2, matches2, basename, getKey) : void 0
      );
      return () => disableScrollRestoration && disableScrollRestoration();
    }, [router, basename, getKey]);
    React10.useLayoutEffect(() => {
      if (restoreScrollPosition === false) {
        return;
      }
      if (typeof restoreScrollPosition === "number") {
        window.scrollTo(0, restoreScrollPosition);
        return;
      }
      if (location.hash) {
        let el = document.getElementById(
          decodeURIComponent(location.hash.slice(1))
        );
        if (el) {
          el.scrollIntoView();
          return;
        }
      }
      if (preventScrollReset === true) {
        return;
      }
      window.scrollTo(0, 0);
    }, [location, restoreScrollPosition, preventScrollReset]);
  }
}
function usePageHide(callback, options) {
  let { capture } = options || {};
  React10.useEffect(() => {
    let opts = capture != null ? { capture } : void 0;
    window.addEventListener("pagehide", callback, opts);
    return () => {
      window.removeEventListener("pagehide", callback, opts);
    };
  }, [callback, capture]);
}
function useViewTransitionState(to, opts = {}) {
  let vtContext = React10.useContext(ViewTransitionContext);
  invariant(
    vtContext != null,
    "`useViewTransitionState` must be used within `react-router-dom`'s `RouterProvider`.  Did you accidentally import `RouterProvider` from `react-router`?"
  );
  let { basename } = useDataRouterContext3(
    "useViewTransitionState"
    /* useViewTransitionState */
  );
  let path = useResolvedPath(to, { relative: opts.relative });
  if (!vtContext.isTransitioning) {
    return false;
  }
  let currentPath = stripBasename(vtContext.currentLocation.pathname, basename) || vtContext.currentLocation.pathname;
  let nextPath = stripBasename(vtContext.nextLocation.pathname, basename) || vtContext.nextLocation.pathname;
  return matchPath(path.pathname, nextPath) != null || matchPath(path.pathname, currentPath) != null;
}
var encoder = new TextEncoder();

// src/api/requestCore.ts
var DEFAULT_TIMEOUT_MS = 12e3;
function hasNavigator() {
  return typeof navigator !== "undefined";
}
function isOffline() {
  return hasNavigator() && typeof navigator.onLine === "boolean" && !navigator.onLine;
}
function isAbortError(error) {
  return error instanceof DOMException ? error.name === "AbortError" : typeof error === "object" && error !== null && "name" in error && error.name === "AbortError";
}
function sleep(ms) {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}
function statusHint(status) {
  if (status === 401 || status === 403) {
    return "Sign in again or verify that this account has access to the requested workflow.";
  }
  if (status === 404) {
    return "The route or record is not available in this environment yet.";
  }
  if (status === 408 || status === 429 || status >= 500) {
    return "PRISM is available but busy right now. Retry in a moment.";
  }
  return void 0;
}
function defaultMessageForStatus(status, fallbackMessage) {
  if (status === 401 || status === 403) {
    return "PRISM rejected this request because the current session is not authorized.";
  }
  if (status === 404) {
    return "PRISM could not find the requested route or record.";
  }
  if (status === 408) {
    return "PRISM took too long to respond to this request.";
  }
  if (status === 429) {
    return "PRISM is rate-limiting requests right now.";
  }
  if (status >= 500) {
    return "PRISM hit a server-side problem while handling this request.";
  }
  return fallbackMessage;
}
var ApiError = class extends Error {
  status;
  kind;
  retryable;
  hint;
  constructor(status, message, options = {}) {
    super(message, options.cause ? { cause: options.cause } : void 0);
    this.name = "ApiError";
    this.status = status;
    this.kind = options.kind ?? "unknown";
    this.retryable = options.retryable ?? false;
    this.hint = options.hint;
  }
};
async function readJsonSafely(response) {
  return response.json().catch(() => null);
}
function extractErrorMessage(payload) {
  if (typeof payload === "object" && payload !== null) {
    const errorField = payload.error;
    if (typeof errorField === "string" && errorField.trim().length > 0) {
      return errorField;
    }
    if (typeof errorField === "object" && errorField !== null && "message" in errorField && typeof errorField.message === "string" && errorField.message.trim().length > 0) {
      return errorField.message;
    }
  }
  return null;
}
function toApiError(error, fallbackMessage = "Request failed") {
  if (error instanceof ApiError) {
    return error;
  }
  if (isAbortError(error)) {
    return new ApiError(408, "PRISM did not respond before the request timed out.", {
      kind: "timeout",
      retryable: true,
      hint: "Retry in a moment. If it keeps timing out, check the local server and network posture.",
      cause: error
    });
  }
  if (isOffline()) {
    return new ApiError(0, "This device appears to be offline, so PRISM could not reach the service.", {
      kind: "offline",
      retryable: true,
      hint: "Reconnect to the network and retry.",
      cause: error
    });
  }
  if (error instanceof Error) {
    return new ApiError(0, error.message || fallbackMessage, {
      kind: "network",
      retryable: true,
      hint: "Check the local PRISM server and your connection, then retry.",
      cause: error
    });
  }
  return new ApiError(0, fallbackMessage, {
    kind: "unknown",
    retryable: false,
    cause: error
  });
}
async function fetchJson(url, options = {}) {
  const {
    method = "GET",
    headers,
    body,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = method.toUpperCase() === "GET" ? 1 : 0,
    fallbackMessage = "Request failed"
  } = options;
  for (let attempt = 0; ; attempt += 1) {
    const controller = new AbortController();
    const timeoutHandle = globalThis.setTimeout(() => controller.abort(), timeoutMs);
    try {
      if (isOffline()) {
        throw new ApiError(0, "This device appears to be offline, so PRISM could not reach the service.", {
          kind: "offline",
          retryable: true,
          hint: "Reconnect to the network and retry."
        });
      }
      const response = await fetch(url, {
        method,
        headers,
        body,
        signal: controller.signal
      });
      if (!response.ok) {
        const payload2 = await readJsonSafely(response);
        const message = extractErrorMessage(payload2) ?? defaultMessageForStatus(response.status, fallbackMessage) ?? response.statusText ?? fallbackMessage;
        throw new ApiError(response.status, message, {
          kind: "http",
          retryable: response.status === 408 || response.status === 429 || response.status >= 500,
          hint: statusHint(response.status)
        });
      }
      const payload = await response.json().catch((parseError) => {
        throw new ApiError(response.status, "PRISM returned a response that could not be parsed as JSON.", {
          kind: "parse",
          retryable: false,
          hint: "Check the backend route contract or server logs for malformed output.",
          cause: parseError
        });
      });
      return payload;
    } catch (error) {
      const issue = toApiError(error, fallbackMessage);
      if (attempt >= retries || !issue.retryable) {
        throw issue;
      }
      await sleep(Math.min(250 * 2 ** attempt, 1e3));
    } finally {
      globalThis.clearTimeout(timeoutHandle);
    }
  }
}

// src/api/client.ts
var API_BASE = "/api/v1";
var apiKey = null;
function getRequestHeaders() {
  const headers = {
    "Content-Type": "application/json"
  };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }
  return headers;
}
async function request(method, path, body) {
  return fetchJson(`${API_BASE}${path}`, {
    method,
    headers: getRequestHeaders(),
    body: body ? JSON.stringify(body) : void 0,
    fallbackMessage: "PRISM request failed"
  });
}
async function calculateSpeedFeed(params) {
  return request("POST", "/speed-feed", params);
}
async function ppgGenerate(params) {
  return request("POST", "/ppg/template", params);
}
async function ppgPipelineProcess(params) {
  return request("POST", "/ppg/pipeline", params);
}
async function ppgMaterialSearch(query) {
  return request("POST", "/ppg/material/search", { query });
}
async function ppgToolSearch(params) {
  return request("POST", "/data/tool/search", params);
}
async function ppgHolderCatalog(params) {
  return request("POST", "/data/holder/catalog", params ?? {});
}
async function ppgProgram(params) {
  return request("POST", "/ppg/program", params);
}
async function ppgValidate(params) {
  return request("POST", "/ppg/validate", params);
}
async function ppgCompare(params) {
  return request("POST", "/ppg/compare", params);
}
async function ppgControllers() {
  return request("GET", "/ppg/controllers");
}
async function ppgOperations() {
  return request("GET", "/ppg/operations");
}
async function ppgMachineManufacturers() {
  return request("GET", "/ppg/machine/manufacturers");
}
async function ppgMachineFingerprint(params) {
  return request("POST", "/ppg/machine/fingerprint", params);
}
async function ppgMachineFeatures(params) {
  return request("GET", "/ppg/machine/features", params);
}
async function ppgDownload(params) {
  return request("POST", "/ppg/download", params);
}
async function ppgProveOut(params) {
  return request("POST", "/ppg/prove-out", params);
}
async function ppgValidateLimits(params) {
  return request("POST", "/ppg/validate-limits", params);
}
async function ppgHistory() {
  return request("GET", "/ppg/history");
}
async function ppgProgramsList(controller, offset = 0, limit = 50, search = "") {
  const params = new URLSearchParams({ controller, offset: String(offset), limit: String(limit), search });
  return request("GET", `/ppg/programs/list?${params}`);
}
async function ppgProgramLoad(filePath) {
  return request("GET", `/ppg/programs/load?path=${encodeURIComponent(filePath)}`);
}
async function ppgProgramsStats() {
  return request("GET", "/ppg/programs/stats");
}

// src/utils/workflowRouteContext.ts
function normalizeOriginContext(origin) {
  return {
    source: origin?.source ?? "",
    recordType: origin?.recordType ?? "",
    recordId: origin?.recordId ?? "",
    customer: origin?.customer ?? "",
    note: origin?.note ?? "",
    threadId: origin?.threadId ?? ""
  };
}
function normalizeFocusContext(focus) {
  const type = focus?.type ?? (focus?.jobId ? "job" : focus?.quoteId ? "quote" : focus?.packetId ? "packet" : "");
  const id = focus?.id ?? (type === "job" ? focus?.jobId ?? "" : type === "quote" ? focus?.quoteId ?? "" : type === "packet" ? focus?.packetId ?? "" : "");
  return {
    type,
    id,
    jobId: focus?.jobId || (type === "job" ? id : ""),
    quoteId: focus?.quoteId || (type === "quote" ? id : ""),
    packetId: focus?.packetId || (type === "packet" ? id : "")
  };
}
function parseWorkflowRouteContext(search = "") {
  const params = new URLSearchParams(search);
  const focusType = params.get("focusType") ?? "";
  const focusId = params.get("focusId") ?? "";
  return {
    profile: params.get("profile") ?? "",
    origin: normalizeOriginContext({
      source: params.get("originSource") ?? params.get("source") ?? "",
      recordType: params.get("originType") ?? params.get("recordType") ?? "",
      recordId: params.get("originId") ?? params.get("recordId") ?? "",
      customer: params.get("originCustomer") ?? params.get("customer") ?? "",
      note: params.get("originNote") ?? params.get("note") ?? "",
      threadId: params.get("originThreadId") ?? params.get("thread") ?? ""
    }),
    focus: normalizeFocusContext({
      type: focusType,
      id: focusId,
      jobId: params.get("focusJobId") ?? "",
      quoteId: params.get("focusQuoteId") ?? "",
      packetId: params.get("focusPacketId") ?? ""
    })
  };
}
function formatWorkflowSourceLabel(source) {
  if (!source) {
    return "";
  }
  const knownLabels = {
    dashboard: "Dashboard",
    calculator: "Calculator",
    customers: "Customers & CRM",
    "purchase-orders": "Purchase Orders",
    purchasing: "Purchasing",
    "document-learning": "Document Learning",
    messages: "Messages",
    "jobs-desk": "Jobs desk",
    "scheduling-desk": "Scheduling desk",
    jobs: "Jobs",
    "quote-builder": "Quote Builder",
    ppg: "Post Processor Generator",
    "print-to-cnc": "Print to CNC",
    "shop-floor-clock": "Shop Floor Clock",
    "quality-management": "Quality Management",
    "inventory-desk": "Inventory desk",
    "parts-library": "Parts Library",
    "customer-portal": "Customer Portal",
    "alarm-decoder": "Alarm Decoder",
    "employee-shell": "Employee shell",
    "employee-directory": "Employee Directory",
    timecards: "Timecards",
    payroll: "Payroll",
    invoices: "Invoices",
    "general-ledger": "General Ledger",
    "financial-analysis": "Financial Analysis",
    "order-tracking": "Order Tracking",
    "executive-dashboard": "Executive Dashboard",
    "daily-flash": "Daily Flash",
    "rfq-inbox": "RFQ Inbox",
    "sales-pipeline": "Sales Pipeline",
    commissions: "Commissions",
    "credit-management": "Credit Management",
    "vendor-scorecard": "Vendor Scorecard",
    receiving: "Receiving",
    shipping: "Shipping",
    maintenance: "Preventive Maintenance",
    assets: "Equipment Assets",
    "work-orders": "Maintenance Work Orders",
    calibration: "Calibration",
    osha: "OSHA Compliance",
    "audit-manager": "Audit Manager",
    lathe: "Lathe Print to Program",
    "shop-live": "Shop Live",
    shop: "Shop Profile",
    "ai-learning": "AI Learning"
  };
  return knownLabels[source] ?? source.replace(/-/g, " ");
}
function buildWorkflowParams(currentSearch = "", options = {}) {
  const currentParams = new URLSearchParams(currentSearch);
  const params = new URLSearchParams();
  const origin = normalizeOriginContext(options.origin);
  const focus = normalizeFocusContext(options.focus);
  const includeLegacy = options.includeLegacy ?? true;
  if ((options.preserveProfile ?? true) && currentParams.get("profile")) {
    params.set("profile", currentParams.get("profile") ?? "");
  }
  if (origin.source) {
    params.set("originSource", origin.source);
    if (includeLegacy) params.set("source", origin.source);
  }
  if (origin.recordType) {
    params.set("originType", origin.recordType);
    if (includeLegacy) params.set("recordType", origin.recordType);
  }
  if (origin.recordId) {
    params.set("originId", origin.recordId);
    if (includeLegacy) params.set("recordId", origin.recordId);
  }
  if (origin.customer) {
    params.set("originCustomer", origin.customer);
    if (includeLegacy) params.set("customer", origin.customer);
  }
  if (origin.note) {
    params.set("originNote", origin.note);
    if (includeLegacy) params.set("note", origin.note);
  }
  if (origin.threadId) {
    params.set("originThreadId", origin.threadId);
    if (includeLegacy) params.set("thread", origin.threadId);
  }
  if (focus.type) params.set("focusType", focus.type);
  if (focus.id) params.set("focusId", focus.id);
  if (focus.jobId) params.set("focusJobId", focus.jobId);
  if (focus.quoteId) params.set("focusQuoteId", focus.quoteId);
  if (focus.packetId) params.set("focusPacketId", focus.packetId);
  for (const [key, value] of Object.entries(options.extras ?? {})) {
    if (value) {
      params.set(key, value);
    }
  }
  return params;
}
function buildWorkflowPath(basePath, currentSearch = "", options = {}) {
  const params = buildWorkflowParams(currentSearch, options);
  const suffix = params.toString();
  return `${basePath}${suffix ? `?${suffix}` : ""}`;
}

// src/utils/captureRoute.ts
function buildCapturePath(pathname, search = "", context = {}) {
  const routeContext = parseWorkflowRouteContext(search);
  const effectiveOrigin = context.origin ?? (routeContext.origin.source ? routeContext.origin : void 0);
  const effectiveFocus = context.focus ?? (routeContext.focus.id ? routeContext.focus : context.job ? {
    type: "job",
    id: context.job,
    jobId: context.job
  } : void 0);
  const basePath = pathname.startsWith("/employee") ? "/employee/capture" : "/capture";
  return buildWorkflowPath(basePath, search, {
    origin: effectiveOrigin,
    focus: effectiveFocus,
    extras: {
      source: context.source,
      target: context.target,
      job: context.job,
      department: context.department,
      machine: context.machine,
      zone: context.zone,
      note: context.note,
      ...context.extras
    }
  });
}

// src/utils/shopFloorRoute.ts
function buildShopFloorPath(pathname, search = "", context = {}) {
  const routeContext = parseWorkflowRouteContext(search);
  const effectiveOrigin = context.origin ?? (routeContext.origin.source ? routeContext.origin : void 0);
  const effectiveFocus = context.focus ?? (routeContext.focus.id ? routeContext.focus : context.job ? {
    type: "job",
    id: context.job,
    jobId: context.job
  } : void 0);
  const isEmployeeShellPath = pathname === "/employee" || pathname.startsWith("/employee/");
  const basePath = isEmployeeShellPath ? "/employee/shop-clock" : "/shop-clock";
  return buildWorkflowPath(basePath, search, {
    origin: effectiveOrigin,
    focus: effectiveFocus,
    extras: {
      source: context.source,
      scan: context.scan,
      job: context.job,
      department: context.department,
      operation: context.operation,
      machine: context.machine,
      note: context.note,
      ...context.extras
    }
  });
}

// src/components/workspace/WorkspacePrimitives.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
function WorkspaceHero({
  eyebrow,
  title,
  description,
  metrics,
  aside
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", { className: "overflow-hidden rounded-[32px] border border-cyan-300/10 bg-[linear-gradient(135deg,rgba(7,14,22,0.98)_0%,rgba(5,10,16,0.98)_42%,rgba(18,32,48,0.96)_100%)] p-6 shadow-[0_40px_120px_rgba(0,0,0,0.34)]", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "grid gap-8 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-y-5", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "inline-flex rounded-full border border-cyan-300/16 bg-cyan-300/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-100", children: eyebrow }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-y-3", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { className: "text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl", children: title }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "max-w-3xl text-base leading-7 text-slate-300", children: description })
      ] }),
      metrics ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "grid gap-3 sm:grid-cols-3", children: metrics }) : null
    ] }),
    aside ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "rounded-[28px] border border-white/10 bg-black/20 p-5", children: aside }) : null
  ] }) });
}
function SummaryTile({
  label,
  value,
  hint,
  accent
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "relative overflow-hidden rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-br ${accent ?? "from-cyan-400/22 via-cyan-300/10 to-transparent"}` }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "relative", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500", children: label }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mt-3 text-2xl font-semibold text-slate-50", children: value }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mt-2 text-sm text-slate-400", children: hint })
    ] })
  ] });
}
function PanelCard({
  title,
  subtitle,
  children
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.96)_100%)] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.28)]", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "mb-5", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-xl font-semibold text-slate-50", children: title }),
      subtitle ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mt-1 text-sm text-slate-400", children: subtitle }) : null
    ] }),
    children
  ] });
}
function Field({
  label,
  children
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "block", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400", children: label }),
    children
  ] });
}
function Input(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "input",
    {
      ...props,
      className: `w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/32 ${props.className ?? ""}`
    }
  );
}
function Select(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "select",
    {
      ...props,
      className: `w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/32 ${props.className ?? ""}`
    }
  );
}
function TabButton({
  active,
  children,
  onClick
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "button",
    {
      type: "button",
      onClick,
      className: `rounded-full border px-4 py-2 text-sm font-semibold transition ${active ? "border-cyan-300/20 bg-cyan-300/[0.12] text-cyan-50" : "border-white/8 bg-white/[0.03] text-slate-300 hover:border-white/16 hover:bg-white/[0.06]"}`,
      children
    }
  );
}
function StatusPill({
  label,
  tone = "slate"
}) {
  const palette = {
    slate: "bg-slate-300/16 text-slate-100",
    emerald: "bg-emerald-300/16 text-emerald-100",
    amber: "bg-amber-300/16 text-amber-100",
    rose: "bg-rose-300/16 text-rose-100",
    sky: "bg-sky-300/16 text-sky-100",
    violet: "bg-violet-300/16 text-violet-100"
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `inline-flex rounded-full px-3 py-1 text-xs font-semibold ${palette[tone] ?? palette.slate}`, children: label });
}
function ActionButton({
  children,
  onClick,
  disabled,
  tone = "cyan",
  className
}) {
  const palette = {
    cyan: "bg-cyan-300 text-slate-950 hover:bg-cyan-200",
    emerald: "bg-emerald-300 text-slate-950 hover:bg-emerald-200",
    amber: "bg-amber-300 text-slate-950 hover:bg-amber-200",
    rose: "bg-rose-300 text-slate-950 hover:bg-rose-200"
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "button",
    {
      type: "button",
      onClick,
      disabled,
      className: `rounded-2xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300 ${palette[tone] ?? palette.cyan} ${className ?? ""}`,
      children
    }
  );
}

// src/features/machine-workspace/MachineWorkspaceAuthorityCard.tsx
var import_jsx_runtime2 = __toESM(require_jsx_runtime(), 1);
function programmingAuthorityTone(posture) {
  if (posture === "live-contract") {
    return "emerald";
  }
  if (posture === "curated-service" || posture === "hybrid") {
    return "violet";
  }
  if (posture === "fallback-staged") {
    return "amber";
  }
  return "sky";
}
function MachineWorkspaceAuthorityCard({
  context,
  title = "Shared routed machine authority",
  subtitle = "This wizard now inherits the same JM Die machine, controller, and programming posture from the routed upload surface."
}) {
  const programmingValue = context.programmingAuthority?.environmentLabel ?? context.programmingAuthority?.badge ?? "Shared default";
  const programmingHint = [
    context.programmingAuthority?.licenseLabel,
    context.programmingAuthority?.toolpathLabel ?? context.programmingAuthority?.toolpathTypeLabel
  ].filter(Boolean).join(" | ") || context.programmingAuthority?.summary || "Programming authority pending";
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(PanelCard, { title, subtitle, children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex flex-wrap items-center gap-2", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(StatusPill, { label: "JM Die routed authority", tone: "sky" }),
      context.machineLabel ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(StatusPill, { label: context.machineLabel, tone: "slate" }) : null,
      context.programmingAuthority ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        StatusPill,
        {
          label: context.programmingAuthority.badge,
          tone: programmingAuthorityTone(context.programmingAuthority.posture)
        }
      ) : null
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "mt-4 grid gap-3 lg:grid-cols-4", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        SummaryTile,
        {
          label: "Machine",
          value: context.machineLabel ?? context.machineId ?? "Shared default",
          hint: context.machineKinematics ?? "Machine posture pending"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        SummaryTile,
        {
          label: "Controller",
          value: context.controllerLabel ?? context.controllerId ?? "Shared default",
          hint: context.machineManufacturer ? `Authority source: ${context.machineManufacturer}` : "Authority source pending"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        SummaryTile,
        {
          label: "Material",
          value: context.materialLabel,
          hint: `Material group: ${context.materialGroup}`
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        SummaryTile,
        {
          label: "Programming posture",
          value: programmingValue,
          hint: programmingHint
        }
      )
    ] }),
    context.selectorAuthorityNote ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "mt-4 rounded-[22px] border border-emerald-300/14 bg-emerald-300/[0.05] px-4 py-4 text-sm leading-6 text-slate-200", children: context.selectorAuthorityNote }) : null,
    context.programmingAuthority?.note ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "mt-4 rounded-[22px] border border-violet-300/14 bg-violet-300/[0.05] px-4 py-4 text-sm leading-6 text-slate-200", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-100", children: "Programming authority" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "mt-2", children: context.programmingAuthority.note })
    ] }) : null
  ] });
}

// src/components/ppg/ControllerOverridePanel.tsx
var import_react = __toESM(require_react(), 1);
var import_jsx_runtime3 = __toESM(require_jsx_runtime(), 1);
var CONTROLLER_DIALECTS = [
  { value: "haas_ngc", label: "Haas NGC", family: "Mill / Turning", features: ["G187 smoothing", "M65 probing", "M97/M98 subs"] },
  { value: "fanuc_31i", label: "Fanuc 31i", family: "Mill / Multiaxis", features: ["Macro B", "G43.4 TCP", "G68.2 tilted plane"] },
  { value: "fanuc_0i", label: "Fanuc 0i", family: "Mill / Lathe", features: ["G65 macro", "Canned cycles", "Basic probing"] },
  { value: "siemens_840d", label: "Siemens 840D", family: "5-axis / Aerospace", features: ["TRAORI", "CYCLE832", "CYCLE977 probing"] },
  { value: "heidenhain_tnc640", label: "Heidenhain TNC 640", family: "5-axis / Mold", features: ["TCH PROBE", "Cycle 32 smoothing", "M91 machine coords"] },
  { value: "heidenhain_tnc7", label: "Heidenhain TNC 7", family: "5-axis / Mold", features: ["Dynamic Precision", "Touch probe 1001", "OCM milling"] },
  { value: "mazak_smooth_ai", label: "Mazatrol Smooth Ai", family: "Mill-turn / Production", features: ["AI thermal comp", "Smooth machining", "Voice advisor"] },
  { value: "okuma_osp_p300", label: "Okuma OSP-P300", family: "Turning / Mill-turn", features: ["Thermo-Friendly", "Collision avoidance", "DPRNT probing"] },
  { value: "brother_speedio", label: "Brother Speedio", family: "Compact Mill", features: ["High-speed tap", "16K RPM", "Macro-based probing"] },
  { value: "doosan_fanuc", label: "Doosan (Fanuc)", family: "Turning / Mill", features: ["Fanuc 0i/31i base", "Turret indexing", "Live tooling"] },
  { value: "hurco_max5", label: "Hurco MAX5", family: "Mill / Conversational", features: ["UltiMotion", "WinMax", "Conversational + NC"] },
  { value: "citizen_cincom", label: "Citizen Cincom", family: "Swiss", features: ["Guide bushing", "LFV chip break", "Gang+turret sync"] },
  { value: "star_fanuc", label: "Star (Fanuc)", family: "Swiss", features: ["Sliding head", "Multi-channel sync", "Thread whirling"] },
  { value: "dmg_celos_siemens", label: "DMG MORI CELOS (Siemens)", family: "5-axis / Mill-turn", features: ["CELOS UI", "TRAORI", "MPC sensor"] },
  { value: "dmg_celos_fanuc", label: "DMG MORI CELOS (Fanuc)", family: "5-axis / Mill-turn", features: ["CELOS UI", "Fanuc base", "AI chip removal"] },
  { value: "mitsubishi_m80", label: "Mitsubishi M80", family: "Mill / Lathe", features: ["SSS control", "OMR-FF", "Macro B compatible"] },
  { value: "fagor_8065", label: "Fagor 8065", family: "Mill / Lathe", features: ["HSSA smoothing", "Probing cycles", "Retrace function"] },
  { value: "generic_fanuc", label: "Generic Fanuc", family: "Universal", features: ["G-code standard", "M98/M99 subs", "Basic cycles"] },
  { value: "generic_iso", label: "Generic ISO 6983", family: "Universal", features: ["ISO G-code only", "No macros", "Maximum compatibility"] }
];
function ControllerOverridePanel({
  fingerprint,
  controllerOverride,
  onOverrideChange,
  availableControllers
}) {
  const autoDetected = fingerprint?.controller_family ?? "";
  const isOverriding = controllerOverride !== "" && controllerOverride !== autoDetected;
  const controllerOptions = (0, import_react.useMemo)(() => {
    if (availableControllers.length > 0) return availableControllers;
    return CONTROLLER_DIALECTS.map((d) => ({ value: d.value, label: d.label }));
  }, [availableControllers]);
  const autoInfo = (0, import_react.useMemo)(
    () => CONTROLLER_DIALECTS.find((d) => d.value === autoDetected),
    [autoDetected]
  );
  const overrideInfo = (0, import_react.useMemo)(
    () => CONTROLLER_DIALECTS.find((d) => d.value === controllerOverride),
    [controllerOverride]
  );
  const activeController = isOverriding ? controllerOverride : autoDetected;
  const activeInfo = isOverriding ? overrideInfo : autoInfo;
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
    PanelCard,
    {
      title: "Controller override",
      subtitle: fingerprint ? `Auto-detected: ${autoDetected}. Override if the machine has been retrofitted or uses a non-standard controller.` : "Resolve a machine first to see the auto-detected controller.",
      children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "grid gap-4 md:grid-cols-2", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "space-y-3", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Field, { label: "Auto-detected controller", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-slate-200", children: [
            autoDetected || "None \u2014 resolve a machine first",
            fingerprint && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
              StatusPill,
              {
                label: `${Math.round(fingerprint.confidence * 100)}%`,
                tone: fingerprint.confidence >= 0.85 ? "emerald" : "amber"
              }
            )
          ] }) }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Field, { label: "Override controller", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
            Select,
            {
              "aria-label": "Controller override",
              value: controllerOverride,
              onChange: (e) => onOverrideChange(e.target.value),
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("option", { value: "", children: "Use auto-detected" }),
                controllerOptions.map((c) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("option", { value: c.value, children: c.label }, c.value))
              ]
            }
          ) }),
          isOverriding && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "rounded-2xl border border-amber-300/14 bg-amber-300/[0.08] px-4 py-3 text-sm text-amber-100", children: [
            "Override active \u2014 controller changed from",
            " ",
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "font-semibold", children: autoDetected }),
            " to",
            " ",
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "font-semibold", children: controllerOverride }),
            ". Feature recommendations may not match the physical machine."
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "rounded-[22px] border border-white/10 bg-white/[0.03] p-4", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "text-xs font-semibold uppercase tracking-[0.18em] text-slate-400", children: isOverriding ? "Override controller features" : "Active controller features" }),
          activeInfo ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "mt-3 space-y-3", children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "text-lg font-semibold text-slate-50", children: activeInfo.label }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "text-sm text-slate-300", children: activeInfo.family }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "flex flex-wrap gap-2", children: activeInfo.features.map((f) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(StatusPill, { label: f, tone: "slate" }, f)) })
          ] }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "mt-3 text-sm text-slate-400", children: activeController ? `${activeController} \u2014 features not cataloged yet.` : "No controller selected." }),
          isOverriding && autoInfo && overrideInfo && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "mt-4 border-t border-white/10 pt-4", children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "text-xs font-semibold uppercase tracking-[0.18em] text-slate-400", children: "Feature comparison" }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "mt-2 grid gap-2 text-xs text-slate-300", children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "text-slate-400", children: "Auto:" }),
                " ",
                autoInfo.features.join(", ")
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "text-slate-400", children: "Override:" }),
                " ",
                overrideInfo.features.join(", ")
              ] })
            ] })
          ] })
        ] })
      ] })
    }
  );
}

// src/components/ppg/FeatureTogglePanel.tsx
var import_react2 = __toESM(require_react(), 1);
var import_jsx_runtime4 = __toESM(require_jsx_runtime(), 1);
var FEATURE_TOGGLES = [
  {
    id: "probing",
    label: "Probing cycles",
    category: "safety",
    featureKey: "probing",
    description: "WCS setup verification, tool length measurement, and in-process inspection."
  },
  {
    id: "tsc",
    label: "Through-spindle coolant",
    category: "performance",
    featureKey: "tsc",
    description: "High-pressure coolant through tool for deep holes and difficult materials."
  },
  {
    id: "hsm",
    label: "High-speed smoothing",
    category: "performance",
    featureKey: "hsm",
    description: "G187 / CYCLE832 / AICC look-ahead for surface finish and motion control."
  },
  {
    id: "tcp",
    label: "RTCP / TCPM",
    category: "performance",
    featureKey: "tcp",
    description: "Tool center point management for 5-axis simultaneous motion."
  },
  {
    id: "ssv",
    label: "Spindle speed variation",
    category: "performance",
    featureKey: "ssv",
    description: "Chatter suppression by varying spindle speed around setpoint."
  },
  {
    id: "subprograms",
    label: "Subprogram support",
    category: "automation",
    featureKey: "subprograms",
    description: "M98/CALL PGM for repeating patterns, pallet workflows, and production runs."
  },
  {
    id: "chip_conveyor",
    label: "Chip conveyor control",
    category: "automation",
    featureKey: "chip_conveyor",
    description: "Auto chip management with M31/M32 codes in program header/footer."
  }
];
var CATEGORY_ORDER = ["safety", "performance", "automation"];
var CATEGORY_LABELS = {
  safety: "Safety",
  performance: "Performance",
  automation: "Automation"
};
var CATEGORY_COLORS = {
  safety: "border-emerald-300/14 bg-emerald-300/[0.04]",
  performance: "border-cyan-300/14 bg-cyan-300/[0.04]",
  automation: "border-violet-300/14 bg-violet-300/[0.04]"
};
function FeatureTogglePanel({
  fingerprint,
  enabledFeatures,
  onToggle
}) {
  const [firmwareFeatures, setFirmwareFeatures] = (0, import_react2.useState)([]);
  (0, import_react2.useEffect)(() => {
    if (!fingerprint) {
      setFirmwareFeatures([]);
      return;
    }
    let active = true;
    async function load() {
      try {
        const res = await ppgMachineFeatures({
          controller: fingerprint.controller_family
        });
        if (!active) return;
        const data2 = res;
        const inner = data2.result ?? data2.data ?? data2;
        const features = inner.features;
        if (Array.isArray(features)) {
          setFirmwareFeatures(
            features.filter((f) => f && typeof f === "object").map((f) => String(f.id ?? f.name ?? "")).filter(Boolean)
          );
        }
      } catch {
        if (active) setFirmwareFeatures([]);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [fingerprint?.controller_family]);
  const grouped = (0, import_react2.useMemo)(() => {
    const groups = {};
    for (const cat of CATEGORY_ORDER) {
      groups[cat] = FEATURE_TOGGLES.filter((f) => f.category === cat);
    }
    return groups;
  }, []);
  const recommended = fingerprint?.recommended_features;
  const enabledCount = enabledFeatures.size;
  const recommendedCount = recommended ? Object.values(recommended).filter(Boolean).length : 0;
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
    PanelCard,
    {
      title: "Feature toggles",
      subtitle: fingerprint ? `${recommendedCount} features recommended for ${fingerprint.controller_family} \u2014 toggle to customize post output.` : "Select a machine first to get feature recommendations.",
      children: [
        !fingerprint && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "rounded-[22px] border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-slate-400", children: "Resolve a machine in the picker above to see feature recommendations." }),
        fingerprint && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "space-y-4", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "flex flex-wrap gap-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
              StatusPill,
              {
                label: `${enabledCount} enabled`,
                tone: enabledCount > 0 ? "emerald" : "slate"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
              StatusPill,
              {
                label: `${recommendedCount} recommended`,
                tone: "cyan"
              }
            )
          ] }),
          CATEGORY_ORDER.map((category) => /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
            "div",
            {
              className: `rounded-[22px] border p-4 ${CATEGORY_COLORS[category]}`,
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400", children: CATEGORY_LABELS[category] }),
                /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "grid gap-3 sm:grid-cols-2", children: grouped[category].map((feature) => {
                  const isRecommended = recommended?.[feature.featureKey] ?? false;
                  const isEnabled = enabledFeatures.has(feature.id);
                  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
                    "label",
                    {
                      className: `flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition ${isEnabled ? "border-cyan-300/20 bg-cyan-300/[0.06]" : "border-white/8 bg-white/[0.02] hover:border-white/14"}`,
                      children: [
                        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                          "input",
                          {
                            type: "checkbox",
                            checked: isEnabled,
                            onChange: (e) => onToggle(feature.id, e.target.checked),
                            className: "mt-0.5 h-4 w-4 rounded border-slate-500 bg-slate-800 text-cyan-400 focus:ring-cyan-400/40"
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "min-w-0 flex-1", children: [
                          /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "flex items-center gap-2", children: [
                            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "text-sm font-medium text-slate-100", children: feature.label }),
                            isRecommended && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-200", children: "Recommended" })
                          ] }),
                          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "mt-1 text-xs text-slate-400", children: feature.description })
                        ] })
                      ]
                    },
                    feature.id
                  );
                }) })
              ]
            },
            category
          ))
        ] })
      ]
    }
  );
}

// src/components/ppg/GcodeComparisonPanel.tsx
var import_react3 = __toESM(require_react(), 1);
var import_jsx_runtime5 = __toESM(require_jsx_runtime(), 1);
function classifyToken(token) {
  if (/^\(.*\)$/.test(token)) return "text-slate-500 italic";
  if (/^;/.test(token)) return "text-slate-500 italic";
  if (/^[Gg]\d/.test(token)) return "text-cyan-300";
  if (/^[Mm]\d/.test(token)) return "text-violet-300";
  if (/^[Ss]\d/.test(token)) return "text-amber-300";
  if (/^[Ff]\d/.test(token)) return "text-emerald-300";
  if (/^[Tt]\d/.test(token)) return "text-rose-300";
  if (/^[XYZABC]-?\d/.test(token)) return "text-sky-200";
  if (/^[IJKR]-?\d/.test(token)) return "text-teal-300";
  return "text-slate-200";
}
function highlightLine(line) {
  const tokens = line.match(/\([^)]*\)|;.*$|[^\s]+/g) ?? [line];
  return tokens.map((token, i) => /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("span", { className: classifyToken(token), children: [
    i > 0 ? " " : "",
    token
  ] }, i));
}
function computeDiff(leftLines, rightLines) {
  const max = Math.max(leftLines.length, rightLines.length);
  const left = [];
  const right = [];
  for (let i = 0; i < max; i++) {
    const l = (leftLines[i] ?? "").trim();
    const r = (rightLines[i] ?? "").trim();
    const differs = l !== r;
    left.push(differs && i < leftLines.length);
    right.push(differs && i < rightLines.length);
  }
  return { left, right };
}
function confidenceBadgeClass(c) {
  if (c >= 0.85) return "bg-emerald-400/20 text-emerald-200";
  if (c >= 0.6) return "bg-amber-400/20 text-amber-200";
  return "bg-rose-400/20 text-rose-200";
}
function GcodeComparisonPanel({
  traditional,
  optimized,
  controller,
  confidenceMap = {}
}) {
  const tradLines = (0, import_react3.useMemo)(() => traditional.split("\n"), [traditional]);
  const optLines = (0, import_react3.useMemo)(() => optimized.split("\n"), [optimized]);
  const diff = (0, import_react3.useMemo)(() => computeDiff(tradLines, optLines), [tradLines, optLines]);
  const changedCount = (0, import_react3.useMemo)(() => diff.right.filter(Boolean).length, [diff.right]);
  const avgConfidence = (0, import_react3.useMemo)(() => {
    const vals = Object.values(confidenceMap);
    if (vals.length === 0) return 0;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }, [confidenceMap]);
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
    PanelCard,
    {
      title: "Before / After comparison",
      subtitle: `Traditional vs PRISM-optimized output for ${controller}. ${changedCount} lines differ.`,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "mb-4 flex flex-wrap gap-2", children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
            StatusPill,
            {
              label: `${changedCount} changed`,
              tone: changedCount > 0 ? "amber" : "slate"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(StatusPill, { label: `${tradLines.length} \u2192 ${optLines.length} lines`, tone: "slate" }),
          avgConfidence > 0 && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
            StatusPill,
            {
              label: `${Math.round(avgConfidence * 100)}% avg confidence`,
              tone: avgConfidence >= 0.85 ? "emerald" : avgConfidence >= 0.6 ? "amber" : "rose"
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "grid gap-4 lg:grid-cols-2", children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "overflow-hidden rounded-[22px] border border-white/10 bg-slate-950/90", children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "border-b border-white/8 bg-white/[0.03] px-4 py-2", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "text-xs font-semibold uppercase tracking-[0.18em] text-slate-400", children: "Traditional (single S/F)" }) }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("pre", { className: "max-h-[480px] overflow-auto p-4 text-xs leading-6", children: tradLines.map((line, i) => /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
              "div",
              {
                className: `flex items-start gap-2${diff.left[i] ? " -mx-4 bg-rose-400/8 px-4" : ""}`,
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "w-8 shrink-0 select-none text-right text-slate-600", children: i + 1 }),
                  diff.left[i] && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "shrink-0 select-none text-rose-400", children: "\u2212" }),
                  /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "flex-1", children: highlightLine(line) })
                ]
              },
              i
            )) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "overflow-hidden rounded-[22px] border border-cyan-300/14 bg-slate-950/90", children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "border-b border-cyan-300/10 bg-cyan-300/[0.03] px-4 py-2", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200", children: "PRISM Optimized (per-block S/F)" }) }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("pre", { className: "max-h-[480px] overflow-auto p-4 text-xs leading-6", children: optLines.map((line, i) => {
              const confidence = confidenceMap[i];
              return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
                "div",
                {
                  className: `flex items-start gap-2${diff.right[i] ? " -mx-4 bg-emerald-400/8 px-4" : ""}`,
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "w-8 shrink-0 select-none text-right text-slate-600", children: i + 1 }),
                    diff.right[i] && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "shrink-0 select-none text-emerald-400", children: "+" }),
                    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "flex-1", children: highlightLine(line) }),
                    confidence !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
                      "span",
                      {
                        className: `shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${confidenceBadgeClass(confidence)}`,
                        children: [
                          Math.round(confidence * 100),
                          "%"
                        ]
                      }
                    )
                  ]
                },
                i
              );
            }) })
          ] })
        ] })
      ]
    }
  );
}

// src/components/ppg/MachinePickerPanel.tsx
var import_react4 = __toESM(require_react(), 1);
var import_jsx_runtime6 = __toESM(require_jsx_runtime(), 1);
function unwrapData(response) {
  if (!response || typeof response !== "object") return null;
  const r = response;
  const inner = r.result ?? r.data;
  if (inner && typeof inner === "object" && !Array.isArray(inner))
    return inner;
  return r;
}
function extractManufacturers(payload) {
  if (!payload) return [];
  const list = payload.manufacturers ?? payload.items ?? [];
  if (!Array.isArray(list)) return [];
  return list.filter((item) => typeof item === "string" && item.length > 0).sort((a, b) => a.localeCompare(b));
}
function resolutionLabel(method) {
  const map = {
    exact_catalog: "Exact catalog match",
    fuzzy_catalog: "Fuzzy catalog match",
    year_based: "Year-based resolution",
    manufacturer_default: "Manufacturer default",
    controller_override: "Manual override",
    fallback: "Generic fallback"
  };
  return map[method] ?? method;
}
function confidenceTone(confidence) {
  if (confidence >= 0.85) return "emerald";
  if (confidence >= 0.6) return "amber";
  return "rose";
}
function MachinePickerPanel({
  onFingerprintChange,
  onManufacturerChange,
  onModelChange
}) {
  const [manufacturers, setManufacturers] = (0, import_react4.useState)([]);
  const [manufacturer, setManufacturer] = (0, import_react4.useState)("");
  const [model, setModel] = (0, import_react4.useState)("");
  const [year, setYear] = (0, import_react4.useState)("");
  const [loading, setLoading] = (0, import_react4.useState)(false);
  const [catalogLoading, setCatalogLoading] = (0, import_react4.useState)(false);
  const [fingerprint, setFingerprint] = (0, import_react4.useState)(null);
  const [error, setError] = (0, import_react4.useState)(null);
  (0, import_react4.useEffect)(() => {
    let active = true;
    async function load() {
      setCatalogLoading(true);
      try {
        const res = await ppgMachineManufacturers();
        if (!active) return;
        const list = extractManufacturers(unwrapData(res));
        setManufacturers(list);
        if (list.length > 0 && !manufacturer) setManufacturer(list[0]);
      } catch {
        if (!active) return;
        setManufacturers([
          "Haas",
          "DMG MORI",
          "Mazak",
          "Okuma",
          "Makino",
          "Fanuc",
          "Siemens",
          "Heidenhain",
          "Brother",
          "Doosan",
          "Hurco",
          "Citizen",
          "Star",
          "Hermle",
          "Matsuura"
        ]);
      } finally {
        if (active) setCatalogLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);
  const runFingerprint = (0, import_react4.useCallback)(async () => {
    if (!manufacturer || !model) {
      setFingerprint(null);
      onFingerprintChange(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = { manufacturer, model };
      if (year && !isNaN(Number(year))) params.year = Number(year);
      const res = await ppgMachineFingerprint(params);
      const data2 = unwrapData(res);
      if (data2 && data2.controller_family) {
        const result = data2;
        setFingerprint(result);
        onFingerprintChange(result);
      } else {
        setError("Fingerprint returned no result \u2014 check machine name.");
        setFingerprint(null);
        onFingerprintChange(null);
      }
    } catch (e) {
      setError(e.message ?? "Fingerprint request failed");
      setFingerprint(null);
      onFingerprintChange(null);
    } finally {
      setLoading(false);
    }
  }, [manufacturer, model, year, onFingerprintChange]);
  const [search, setSearch] = (0, import_react4.useState)("");
  const filteredManufacturers = (0, import_react4.useMemo)(() => {
    if (!search) return manufacturers;
    const q = search.toLowerCase();
    return manufacturers.filter((m) => m.toLowerCase().includes(q));
  }, [manufacturers, search]);
  const profile = fingerprint?.matched_profile;
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
    PanelCard,
    {
      title: "Machine selection",
      subtitle: "Pick your machine \u2014 PRISM auto-resolves controller, axis config, and recommended features.",
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "grid gap-4 md:grid-cols-3", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(Field, { label: "Manufacturer", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "space-y-1", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
              Input,
              {
                placeholder: "Search manufacturers...",
                value: search,
                onChange: (e) => setSearch(e.target.value),
                "aria-label": "Search manufacturers"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
              Select,
              {
                "aria-label": "Manufacturer",
                value: manufacturer,
                onChange: (e) => {
                  setManufacturer(e.target.value);
                  setModel("");
                  setFingerprint(null);
                  onFingerprintChange(null);
                  onManufacturerChange?.(e.target.value);
                },
                disabled: catalogLoading,
                children: [
                  catalogLoading && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("option", { value: "", children: "Loading..." }),
                  filteredManufacturers.map((m) => /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("option", { value: m, children: m }, m))
                ]
              }
            )
          ] }) }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(Field, { label: "Model", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
            Input,
            {
              "aria-label": "Machine model",
              placeholder: "e.g. VF-2SS, Integrex i-200",
              value: model,
              onChange: (e) => {
                setModel(e.target.value);
                onModelChange?.(e.target.value);
              }
            }
          ) }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(Field, { label: "Year (optional)", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex gap-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
              Input,
              {
                "aria-label": "Machine year",
                type: "number",
                placeholder: "e.g. 2022",
                min: 1980,
                max: 2030,
                value: year,
                onChange: (e) => setYear(e.target.value),
                className: "flex-1"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
              "button",
              {
                type: "button",
                onClick: () => void runFingerprint(),
                disabled: loading || !manufacturer || !model,
                className: "inline-flex items-center rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.08] px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/[0.14] disabled:opacity-40",
                children: loading ? "Resolving..." : "Resolve"
              }
            )
          ] }) })
        ] }),
        error && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "mt-3 rounded-2xl border border-amber-300/14 bg-amber-300/[0.08] px-4 py-3 text-sm text-amber-100", children: error }),
        fingerprint && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "mt-5 space-y-4", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "grid gap-3 sm:grid-cols-2 xl:grid-cols-4", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
              SummaryTile,
              {
                label: "Controller",
                value: fingerprint.controller_family,
                hint: resolutionLabel(fingerprint.resolution_method),
                accent: "from-cyan-400/22 via-cyan-300/10 to-transparent"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
              SummaryTile,
              {
                label: "Confidence",
                value: `${Math.round(fingerprint.confidence * 100)}%`,
                hint: fingerprint.resolution_method,
                accent: "from-emerald-400/20 via-emerald-300/10 to-transparent"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
              SummaryTile,
              {
                label: "Axis config",
                value: fingerprint.axis_config,
                hint: fingerprint.machine_type,
                accent: "from-violet-400/22 via-violet-300/10 to-transparent"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
              SummaryTile,
              {
                label: "Machine type",
                value: fingerprint.machine_type,
                hint: profile ? `${profile.max_rpm} RPM \xB7 ${profile.taper} \xB7 ${profile.tool_capacity} tools` : "No profile data",
                accent: "from-amber-400/22 via-amber-300/10 to-transparent"
              }
            )
          ] }),
          profile && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "rounded-[22px] border border-white/10 bg-white/[0.03] p-4", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "text-xs font-semibold uppercase tracking-[0.18em] text-slate-400", children: "Matched machine profile" }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "mt-3 grid gap-3 text-sm text-slate-200 sm:grid-cols-2 lg:grid-cols-4", children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-slate-400", children: "Brand:" }),
                " ",
                profile.brand
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-slate-400", children: "Model:" }),
                " ",
                profile.model
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-slate-400", children: "Type:" }),
                " ",
                profile.type
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-slate-400", children: "Controller:" }),
                " ",
                profile.controller
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-slate-400", children: "Max RPM:" }),
                " ",
                profile.max_rpm.toLocaleString()
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-slate-400", children: "Taper:" }),
                " ",
                profile.taper
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-slate-400", children: "Tool capacity:" }),
                " ",
                profile.tool_capacity
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-slate-400", children: "Axes:" }),
                " ",
                profile.axis_count
              ] })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex flex-wrap gap-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(StatusPill, { label: fingerprint.controller_family, tone: "cyan" }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(StatusPill, { label: fingerprint.axis_config, tone: "violet" }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
              StatusPill,
              {
                label: `${Math.round(fingerprint.confidence * 100)}% confidence`,
                tone: confidenceTone(fingerprint.confidence)
              }
            ),
            fingerprint.recommended_features.probing && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(StatusPill, { label: "Probing", tone: "emerald" }),
            fingerprint.recommended_features.hsm && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(StatusPill, { label: "HSM", tone: "emerald" }),
            fingerprint.recommended_features.tcp && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(StatusPill, { label: "TCP/TCPM", tone: "emerald" }),
            fingerprint.recommended_features.tsc && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(StatusPill, { label: "TSC", tone: "emerald" })
          ] }),
          fingerprint.warnings.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "rounded-[22px] border border-amber-300/12 bg-amber-300/[0.06] p-4", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "text-xs font-semibold uppercase tracking-[0.18em] text-amber-100/90", children: "Warnings" }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("ul", { className: "mt-2 space-y-1 text-sm text-slate-200", children: fingerprint.warnings.map((w) => /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("li", { children: [
              "\u2022 ",
              w
            ] }, w)) })
          ] })
        ] })
      ]
    }
  );
}

// src/components/ppg/PostLibraryUI.tsx
var import_react5 = __toESM(require_react(), 1);
var import_jsx_runtime7 = __toESM(require_jsx_runtime(), 1);
var BUILT_IN_POSTS = [
  { id: "haas-ngc-3ax", name: "Haas NGC 3-Axis", description: "Standard Haas Next Generation Control for VMC", source: "cps", vendor: "Haas", controller: "haas_ngc", machine_types: ["mill"], axes: 3, capabilities: ["probing", "hsm", "subprograms"], machine_profile: { max_rpm: 8100, max_power_kW: 22.4, rapid_x: 25400, rapid_y: 25400, rapid_z: 15240, volume_x: 762, volume_y: 406, volume_z: 508, coolant_types: ["flood", "tsc"], recommended_features: ["probing_cycles", "high_speed_smoothing", "subprograms"] } },
  { id: "fanuc-31i-mill", name: "Fanuc 31i Mill", description: "Fanuc 31i-B for VMC/HMC", source: "cps", vendor: "Fanuc", controller: "fanuc_31i", machine_types: ["mill"], axes: 3, capabilities: ["probing", "hsm", "tcp", "subprograms"], machine_profile: { max_rpm: 12e3, max_power_kW: 15, rapid_x: 42e3, rapid_y: 42e3, rapid_z: 36e3, volume_x: 560, volume_y: 410, volume_z: 460, coolant_types: ["flood", "tsc"], recommended_features: ["probing_cycles", "high_speed_smoothing", "subprograms"] } },
  { id: "siemens-840d-5ax", name: "Siemens 840D 5-Axis", description: "Sinumerik 840D sl with CYCLE800/TRAORI", source: "cps", vendor: "Siemens", controller: "siemens_840d", machine_types: ["mill", "5axis"], axes: 5, capabilities: ["hsm", "tcp", "probing", "subprograms"], machine_profile: { max_rpm: 14e3, max_power_kW: 35, rapid_x: 42e3, rapid_y: 42e3, rapid_z: 42e3, volume_x: 500, volume_y: 450, volume_z: 400, coolant_types: ["flood", "tsc", "mql"], recommended_features: ["probing_cycles", "high_speed_smoothing", "rtcp", "subprograms"] } },
  { id: "heidenhain-tnc640", name: "Heidenhain TNC 640", description: "TNC 640 conversational + ISO", source: "cps", vendor: "Heidenhain", controller: "heidenhain_tnc640", machine_types: ["mill", "5axis"], axes: 5, capabilities: ["probing", "tcp", "hsm"], machine_profile: { max_rpm: 18e3, max_power_kW: 28, rapid_x: 4e4, rapid_y: 4e4, rapid_z: 4e4, volume_x: 600, volume_y: 500, volume_z: 500, coolant_types: ["flood", "mql"], recommended_features: ["probing_cycles", "high_speed_smoothing", "rtcp"] } },
  { id: "mazak-smooth", name: "Mazak SmoothAi", description: "Mazak SmoothAi for Integrex/Variaxis", source: "cps", vendor: "Mazak", controller: "mazak_smooth_ai", machine_types: ["mill", "mill_turn"], axes: 5, capabilities: ["hsm", "probing", "subprograms"], machine_profile: { max_rpm: 12e3, max_power_kW: 22, rapid_x: 42e3, rapid_y: 42e3, rapid_z: 36e3, volume_x: 630, volume_y: 510, volume_z: 510, coolant_types: ["flood", "tsc"], recommended_features: ["probing_cycles", "high_speed_smoothing", "rtcp", "subprograms"] } },
  { id: "okuma-osp300", name: "Okuma OSP-P300", description: "OSP-P300 for GENOS/Multus", source: "cps", vendor: "Okuma", controller: "okuma_osp_p300", machine_types: ["mill", "lathe"], axes: 3, capabilities: ["probing", "subprograms"] },
  { id: "brother-speedio", name: "Brother Speedio", description: "Brother CNC-C00 for Speedio series", source: "cps", vendor: "Brother", controller: "brother_speedio", machine_types: ["mill"], axes: 3, capabilities: ["hsm"] },
  { id: "doosan-fanuc", name: "Doosan Fanuc", description: "Doosan DNM/DVF with Fanuc control", source: "cps", vendor: "Doosan", controller: "doosan_fanuc", machine_types: ["mill"], axes: 3, capabilities: ["probing", "hsm", "subprograms"] },
  { id: "citizen-cincom", name: "Citizen Cincom Swiss", description: "Citizen Cincom L/M series Swiss-type", source: "cps", vendor: "Citizen", controller: "citizen_cincom", machine_types: ["swiss"], axes: 3, capabilities: ["subprograms"] },
  { id: "star-fanuc", name: "Star Swiss Fanuc", description: "Star SR/SB series Swiss lathe", source: "cps", vendor: "Star", controller: "star_fanuc", machine_types: ["swiss"], axes: 3, capabilities: ["subprograms"] },
  { id: "hurco-max5", name: "Hurco WinMax", description: "Hurco MAX5 with UltiMotion", source: "cps", vendor: "Hurco", controller: "hurco_max5", machine_types: ["mill"], axes: 3, capabilities: ["hsm"] },
  { id: "dmg-celos-siemens", name: "DMG MORI CELOS (Siemens)", description: "DMG MORI CELOS with Sinumerik", source: "cps", vendor: "DMG MORI", controller: "dmg_celos_siemens", machine_types: ["mill", "5axis"], axes: 5, capabilities: ["hsm", "tcp", "probing", "subprograms"] },
  { id: "prism-universal", name: "PRISM Universal", description: "PRISM-native physics-optimized post with per-block S/F variability. Upload your NC program to optimize.", source: "prism_native", vendor: "PRISM", controller: "generic_iso", machine_types: ["mill", "lathe", "mill_turn"], axes: 3, capabilities: ["probing", "hsm", "tcp", "ssv", "subprograms", "per_block_sf", "kienzle_force", "tool_life"], version: "8.3", machine_profile: { max_rpm: 12e3, max_power_kW: 22, rapid_x: 3e4, rapid_y: 3e4, rapid_z: 2e4, volume_x: 600, volume_y: 400, volume_z: 400, coolant_types: ["flood", "tsc"], recommended_features: ["probing_cycles", "high_speed_smoothing", "subprograms"] } },
  { id: "prism-haas-ngc", name: "PRISM Haas NGC", description: "Physics-optimized Haas NGC post \u2014 Kienzle force model, per-block S/F, G187 HSM, prove-out derating.", source: "prism_native", vendor: "PRISM", controller: "haas_ngc", machine_types: ["mill"], axes: 3, capabilities: ["probing", "hsm", "subprograms", "per_block_sf", "kienzle_force", "tool_life", "prove_out"], version: "8.3", machine_profile: { max_rpm: 8100, max_power_kW: 22.4, rapid_x: 25400, rapid_y: 25400, rapid_z: 15240, volume_x: 762, volume_y: 406, volume_z: 508, coolant_types: ["flood", "tsc"], recommended_features: ["probing_cycles", "high_speed_smoothing", "subprograms"] } },
  { id: "prism-haas-5ax", name: "PRISM Haas UMC 5-Axis", description: "Physics-optimized Haas UMC post \u2014 RTCP (G234), per-block S/F, tilted workplane, chatter SLD.", source: "prism_native", vendor: "PRISM", controller: "haas_ngc", machine_types: ["mill", "5axis"], axes: 5, capabilities: ["probing", "hsm", "tcp", "subprograms", "per_block_sf", "kienzle_force", "tool_life", "rtcp", "chatter_sld"], version: "8.3", machine_profile: { max_rpm: 8100, max_power_kW: 22.4, rapid_x: 25400, rapid_y: 25400, rapid_z: 15240, volume_x: 508, volume_y: 406, volume_z: 394, coolant_types: ["flood", "tsc"], recommended_features: ["probing_cycles", "high_speed_smoothing", "rtcp", "subprograms"] } },
  { id: "prism-fanuc-31i", name: "PRISM Fanuc 31i", description: "Physics-optimized Fanuc 31i post \u2014 per-block S/F, macro variables, Kienzle force, Taylor tool life.", source: "prism_native", vendor: "PRISM", controller: "fanuc_31i", machine_types: ["mill"], axes: 3, capabilities: ["probing", "hsm", "tcp", "subprograms", "per_block_sf", "kienzle_force", "tool_life", "macro_variables"], version: "8.3", machine_profile: { max_rpm: 12e3, max_power_kW: 15, rapid_x: 42e3, rapid_y: 42e3, rapid_z: 36e3, volume_x: 560, volume_y: 410, volume_z: 460, coolant_types: ["flood", "tsc"], recommended_features: ["probing_cycles", "high_speed_smoothing", "subprograms", "macro_variables"] } },
  { id: "prism-siemens-840d", name: "PRISM Siemens 840D", description: "Physics-optimized Sinumerik 840D post \u2014 CYCLE832 HSM, TRAORI, per-block S/F, chatter SLD, thermal wear.", source: "prism_native", vendor: "PRISM", controller: "siemens_840d", machine_types: ["mill", "5axis"], axes: 5, capabilities: ["hsm", "tcp", "probing", "subprograms", "per_block_sf", "kienzle_force", "tool_life", "rtcp", "chatter_sld", "thermal_wear", "ssv"], version: "8.3", machine_profile: { max_rpm: 14e3, max_power_kW: 35, rapid_x: 42e3, rapid_y: 42e3, rapid_z: 42e3, volume_x: 500, volume_y: 450, volume_z: 400, coolant_types: ["flood", "tsc", "mql"], recommended_features: ["probing_cycles", "high_speed_smoothing", "rtcp", "subprograms", "ssv"] } },
  { id: "prism-heidenhain-tnc640", name: "PRISM Heidenhain TNC 640", description: "Physics-optimized TNC 640 post \u2014 M128 TCPM, per-block S/F, cycle-rich output, surface finish prediction.", source: "prism_native", vendor: "PRISM", controller: "heidenhain_tnc640", machine_types: ["mill", "5axis"], axes: 5, capabilities: ["probing", "tcp", "hsm", "per_block_sf", "kienzle_force", "tool_life", "rtcp", "surface_finish"], version: "8.3", machine_profile: { max_rpm: 18e3, max_power_kW: 28, rapid_x: 4e4, rapid_y: 4e4, rapid_z: 4e4, volume_x: 600, volume_y: 500, volume_z: 500, coolant_types: ["flood", "mql"], recommended_features: ["probing_cycles", "high_speed_smoothing", "rtcp"] } },
  { id: "prism-mazak-smooth", name: "PRISM Mazak SmoothAi", description: "Physics-optimized Mazak SmoothAi post \u2014 per-block S/F, mill-turn sync, Kienzle force, SSV.", source: "prism_native", vendor: "PRISM", controller: "mazak_smooth_ai", machine_types: ["mill", "mill_turn"], axes: 5, capabilities: ["hsm", "probing", "subprograms", "per_block_sf", "kienzle_force", "tool_life", "rtcp", "ssv"], version: "8.3", machine_profile: { max_rpm: 12e3, max_power_kW: 22, rapid_x: 42e3, rapid_y: 42e3, rapid_z: 36e3, volume_x: 630, volume_y: 510, volume_z: 510, coolant_types: ["flood", "tsc"], recommended_features: ["probing_cycles", "high_speed_smoothing", "rtcp", "subprograms", "ssv"] } },
  { id: "prism-okuma-osp", name: "PRISM Okuma OSP-P300", description: "Physics-optimized Okuma OSP post \u2014 G270/G180, per-block S/F, G96/G97 CSS, Kienzle force model.", source: "prism_native", vendor: "PRISM", controller: "okuma_osp_p300", machine_types: ["mill", "lathe", "mill_turn"], axes: 3, capabilities: ["probing", "subprograms", "per_block_sf", "kienzle_force", "tool_life", "css_control"], version: "8.3", machine_profile: { max_rpm: 5e3, max_power_kW: 30, rapid_x: 3e4, rapid_y: 3e4, rapid_z: 3e4, volume_x: 660, volume_y: 400, volume_z: 610, coolant_types: ["flood", "tsc"], recommended_features: ["probing_cycles", "subprograms"] } },
  { id: "prism-dmg-celos", name: "PRISM DMG MORI CELOS", description: "Physics-optimized DMG MORI CELOS post \u2014 Sinumerik or Fanuc, per-block S/F, 5-axis RTCP, chatter SLD.", source: "prism_native", vendor: "PRISM", controller: "dmg_celos_siemens", machine_types: ["mill", "5axis"], axes: 5, capabilities: ["hsm", "tcp", "probing", "subprograms", "per_block_sf", "kienzle_force", "tool_life", "rtcp", "chatter_sld"], version: "8.3", machine_profile: { max_rpm: 2e4, max_power_kW: 35, rapid_x: 42e3, rapid_y: 42e3, rapid_z: 42e3, volume_x: 500, volume_y: 500, volume_z: 400, coolant_types: ["flood", "tsc", "mql"], recommended_features: ["probing_cycles", "high_speed_smoothing", "rtcp", "subprograms"] } }
];
var MACHINE_TYPE_LABELS = {
  mill: "Mill",
  lathe: "Lathe",
  mill_turn: "Mill-Turn",
  swiss: "Swiss",
  wire_edm: "Wire EDM",
  sinker_edm: "Sinker EDM",
  laser: "Laser",
  waterjet: "Waterjet",
  "5axis": "5-Axis"
};
var SOURCE_TONES = {
  cps: "sky",
  prism_native: "emerald",
  community: "violet"
};
function PostLibraryUI({ onSelectPost, onGenerateForMachine }) {
  const [catalogPosts, setCatalogPosts] = (0, import_react5.useState)([]);
  const [catalogLoaded, setCatalogLoaded] = (0, import_react5.useState)(false);
  const [query, setQuery] = (0, import_react5.useState)("");
  const [vendorFilter, setVendorFilter] = (0, import_react5.useState)("");
  const [typeFilter, setTypeFilter] = (0, import_react5.useState)("");
  const [sourceFilter, setSourceFilter] = (0, import_react5.useState)("");
  const [selectedPost, setSelectedPost] = (0, import_react5.useState)(null);
  (0, import_react5.useEffect)(() => {
    if (catalogLoaded) return;
    (async () => {
      try {
        const res = await fetch("/api/v1/ppg/programs/catalog");
        const json = await res.json();
        if (json.ok && json.data?.cps_posts) {
          const apiPosts = json.data.cps_posts.map((p) => ({
            id: p.id,
            name: p.name,
            description: `${p.vendor} ${p.name} \u2014 ${p.machine_types?.join(", ")} \u2014 ${p.axes}-axis`,
            source: "cps",
            vendor: p.vendor,
            controller: p.controller,
            machine_types: p.machine_types ?? ["mill"],
            axes: p.axes ?? 3,
            capabilities: []
          }));
          setCatalogPosts(apiPosts);
        }
      } catch {
      }
      setCatalogLoaded(true);
    })();
  }, [catalogLoaded]);
  const posts = (0, import_react5.useMemo)(() => {
    const prismPosts = BUILT_IN_POSTS.filter((p) => p.source === "prism_native");
    const builtInCps = BUILT_IN_POSTS.filter((p) => p.source !== "prism_native");
    if (catalogPosts.length > 0) {
      const catalogIds = new Set(catalogPosts.map((p) => p.id));
      const remainingBuiltIn = builtInCps.filter((p) => !catalogIds.has(p.id));
      return [...prismPosts, ...catalogPosts, ...remainingBuiltIn];
    }
    return BUILT_IN_POSTS;
  }, [catalogPosts]);
  const filteredPosts = posts.filter((p) => {
    if (query && !p.name.toLowerCase().includes(query.toLowerCase()) && !p.vendor.toLowerCase().includes(query.toLowerCase()) && !p.controller.toLowerCase().includes(query.toLowerCase())) return false;
    if (vendorFilter && p.vendor !== vendorFilter) return false;
    if (typeFilter && !p.machine_types.includes(typeFilter)) return false;
    if (sourceFilter && p.source !== sourceFilter) return false;
    return true;
  });
  const vendors = [...new Set(posts.map((p) => p.vendor))].sort();
  const machineTypes = [...new Set(posts.flatMap((p) => p.machine_types))].sort();
  const prismCount = posts.filter((p) => p.source === "prism_native").length;
  const cpsCount = posts.filter((p) => p.source === "cps").length;
  const handleCardClick = (0, import_react5.useCallback)((post) => {
    setSelectedPost(post);
    onSelectPost?.(post);
  }, [onSelectPost]);
  return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "space-y-4", children: [
    /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "flex flex-wrap items-center gap-3", children: [
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "flex-1 min-w-[200px]", children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
        Input,
        {
          value: query,
          onChange: (e) => setQuery(e.target.value),
          placeholder: "Search posts by name, vendor, or controller..."
        }
      ) }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
        "select",
        {
          value: vendorFilter,
          onChange: (e) => setVendorFilter(e.target.value),
          className: "rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-200",
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("option", { value: "", children: "All Vendors" }),
            vendors.map((v) => /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("option", { value: v, children: v }, v))
          ]
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
        "select",
        {
          value: typeFilter,
          onChange: (e) => setTypeFilter(e.target.value),
          className: "rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-200",
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("option", { value: "", children: "All Types" }),
            machineTypes.map((t) => /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("option", { value: t, children: MACHINE_TYPE_LABELS[t] ?? t }, t))
          ]
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "flex gap-1.5", children: [
        /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("button", { onClick: () => setSourceFilter(""), className: `rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition ${!sourceFilter ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"}`, children: [
          "All (",
          posts.length,
          ")"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("button", { onClick: () => setSourceFilter("prism_native"), className: `rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition ${sourceFilter === "prism_native" ? "bg-emerald-500/20 text-emerald-200" : "text-slate-500 hover:text-slate-300"}`, children: [
          "PRISM (",
          prismCount,
          ")"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("button", { onClick: () => setSourceFilter("cps"), className: `rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition ${sourceFilter === "cps" ? "bg-sky-500/20 text-sky-200" : "text-slate-500 hover:text-slate-300"}`, children: [
          "CPS (",
          cpsCount,
          ")"
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("span", { className: "text-xs text-slate-500", children: [
        filteredPosts.length,
        " shown"
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-3", children: filteredPosts.map((post) => /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
      "button",
      {
        onClick: () => handleCardClick(post),
        className: `group rounded-2xl border p-4 text-left transition-all hover:border-sky-500/40 hover:bg-slate-800/60 ${selectedPost?.id === post.id ? "border-sky-500/60 bg-slate-800/80" : "border-white/10 bg-slate-900/60"}`,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "flex items-start justify-between", children: [
            /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "text-sm font-semibold text-slate-100", children: post.name }),
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "mt-0.5 text-xs text-slate-400", children: post.vendor })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(StatusPill, { label: post.source === "prism_native" ? "PRISM" : "CPS", tone: SOURCE_TONES[post.source] ?? "sky" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "mt-2 text-xs text-slate-500 line-clamp-2", children: post.description }),
          /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "mt-2 flex flex-wrap gap-1", children: [
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(StatusPill, { label: post.controller.replace(/_/g, " "), tone: "sky" }),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(StatusPill, { label: `${post.axes}-axis`, tone: "violet" }),
            post.machine_types.map((t) => /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(StatusPill, { label: MACHINE_TYPE_LABELS[t] ?? t, tone: "emerald" }, t))
          ] }),
          post.capabilities.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "mt-2 flex flex-wrap gap-1", children: [
            post.capabilities.slice(0, 4).map((c) => /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-400", children: c }, c)),
            post.capabilities.length > 4 && /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("span", { className: "text-[10px] text-slate-500", children: [
              "+",
              post.capabilities.length - 4
            ] })
          ] })
        ]
      },
      post.id
    )) }),
    selectedPost && /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
      PanelCard,
      {
        title: selectedPost.name,
        subtitle: `${selectedPost.vendor} \u2014 ${selectedPost.controller.replace(/_/g, " ")} \u2014 ${selectedPost.axes}-axis`,
        children: /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "space-y-3", children: [
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "text-sm text-slate-300", children: selectedPost.description }),
          /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "text-xs font-semibold uppercase tracking-widest text-slate-400", children: "Capabilities" }),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "mt-1 flex flex-wrap gap-1.5", children: selectedPost.capabilities.map((c) => /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(StatusPill, { label: c, tone: "sky" }, c)) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "text-xs font-semibold uppercase tracking-widest text-slate-400", children: "Machine Types" }),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "mt-1 flex flex-wrap gap-1.5", children: selectedPost.machine_types.map((t) => /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(StatusPill, { label: MACHINE_TYPE_LABELS[t] ?? t, tone: "emerald" }, t)) })
          ] }),
          selectedPost.version && /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "text-xs text-slate-500", children: [
            "Version: ",
            selectedPost.version
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
            ActionButton,
            {
              onClick: () => onGenerateForMachine?.(selectedPost),
              children: "Generate for My Machine"
            }
          )
        ] })
      }
    )
  ] });
}

// src/components/ppg/PostPreviewComponent.tsx
var import_react6 = __toESM(require_react(), 1);
var import_jsx_runtime8 = __toESM(require_jsx_runtime(), 1);
function classifyToken2(token) {
  if (/^\(.*\)$/.test(token)) return "text-slate-500 italic";
  if (/^;/.test(token)) return "text-slate-500 italic";
  if (/^[Gg]\d/.test(token)) return "text-cyan-300";
  if (/^[Mm]\d/.test(token)) return "text-violet-300";
  if (/^[Ss]\d/.test(token)) return "text-amber-300";
  if (/^[Ff]\d/.test(token)) return "text-emerald-300";
  if (/^[Tt]\d/.test(token)) return "text-rose-300";
  if (/^[XYZABC]-?\d/.test(token)) return "text-sky-200";
  if (/^[IJKR]-?\d/.test(token)) return "text-teal-300";
  return "text-slate-200";
}
function highlightLine2(line) {
  const tokens = line.match(/\([^)]*\)|;.*$|[^\s]+/g) ?? [line];
  return tokens.map((token, i) => /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("span", { className: classifyToken2(token), children: [
    i > 0 ? " " : "",
    token
  ] }, i));
}
function formatAnnotation(a) {
  const parts = [];
  if (a.force_N !== void 0) parts.push(`Force: ${a.force_N.toFixed(1)} N`);
  if (a.power_kW !== void 0) parts.push(`Power: ${a.power_kW.toFixed(2)} kW`);
  if (a.predicted_Ra_um !== void 0) parts.push(`Ra: ${a.predicted_Ra_um.toFixed(2)} \xB5m`);
  if (a.confidence !== void 0) parts.push(`Conf: ${Math.round(a.confidence * 100)}%`);
  if (a.note) parts.push(a.note);
  return parts.join(" \xB7 ");
}
function PostPreviewComponent({
  gcode,
  controller,
  annotations = {},
  onDownload,
  onCopy
}) {
  const [showPhysics, setShowPhysics] = (0, import_react6.useState)(true);
  const [hoveredLine, setHoveredLine] = (0, import_react6.useState)(null);
  const [copied, setCopied] = (0, import_react6.useState)(false);
  const lines = (0, import_react6.useMemo)(() => gcode.split("\n"), [gcode]);
  const annotatedCount = (0, import_react6.useMemo)(() => Object.keys(annotations).length, [annotations]);
  const handleCopy = (0, import_react6.useCallback)(() => {
    void navigator.clipboard.writeText(gcode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2e3);
    onCopy?.();
  }, [gcode, onCopy]);
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(
    PanelCard,
    {
      title: "G-code preview",
      subtitle: `${lines.length} lines for ${controller}${annotatedCount > 0 ? ` \xB7 ${annotatedCount} physics annotations` : ""}`,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "mb-4 flex flex-wrap items-center gap-3", children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
            "button",
            {
              type: "button",
              onClick: handleCopy,
              className: "inline-flex items-center rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-cyan-300/20 hover:bg-cyan-300/[0.08]",
              children: copied ? "Copied!" : "Copy to clipboard"
            }
          ),
          onDownload && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
            "button",
            {
              type: "button",
              onClick: onDownload,
              className: "inline-flex items-center rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.08] px-3 py-1.5 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/[0.14]",
              children: "Download"
            }
          ),
          annotatedCount > 0 && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("label", { className: "flex cursor-pointer items-center gap-2 text-xs text-slate-300", children: [
            /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
              "input",
              {
                type: "checkbox",
                checked: showPhysics,
                onChange: (e) => setShowPhysics(e.target.checked),
                className: "h-3.5 w-3.5 rounded border-slate-500 bg-slate-800 text-cyan-400 focus:ring-cyan-400/40"
              }
            ),
            "Show physics"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ml-auto flex gap-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(StatusPill, { label: `${lines.length} lines`, tone: "slate" }),
            annotatedCount > 0 && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(StatusPill, { label: `${annotatedCount} annotated`, tone: "cyan" })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "overflow-hidden rounded-[22px] border border-white/10 bg-slate-950/90", children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("pre", { className: "max-h-[560px] overflow-auto p-4 text-xs leading-6", children: lines.map((line, i) => {
          const annotation = annotations[i];
          const hasAnnotation = annotation && showPhysics;
          const isHovered = hoveredLine === i;
          return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(
            "div",
            {
              className: `group relative flex items-start gap-2 transition-colors${hasAnnotation ? " hover:bg-cyan-400/6" : ""}${isHovered && hasAnnotation ? " bg-cyan-400/6" : ""}`,
              onMouseEnter: () => hasAnnotation && setHoveredLine(i),
              onMouseLeave: () => setHoveredLine(null),
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "w-8 shrink-0 select-none text-right text-slate-600", children: i + 1 }),
                hasAnnotation && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "shrink-0 select-none text-cyan-500", children: "\\u25CF" }),
                /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "flex-1", children: highlightLine2(line) }),
                hasAnnotation && annotation.confidence !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(
                  "span",
                  {
                    className: `shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${annotation.confidence >= 0.85 ? "bg-emerald-400/20 text-emerald-200" : annotation.confidence >= 0.6 ? "bg-amber-400/20 text-amber-200" : "bg-rose-400/20 text-rose-200"}`,
                    children: [
                      Math.round(annotation.confidence * 100),
                      "%"
                    ]
                  }
                ),
                isHovered && hasAnnotation && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "absolute left-12 top-full z-10 mt-1 rounded-xl border border-cyan-300/20 bg-slate-900 px-3 py-2 text-xs text-slate-200 shadow-lg", children: formatAnnotation(annotation) })
              ]
            },
            i
          );
        }) }) })
      ]
    }
  );
}

// src/components/ppg/MaterialSearchPanel.tsx
var import_react7 = __toESM(require_react(), 1);
var import_jsx_runtime9 = __toESM(require_jsx_runtime(), 1);
var ISO_GROUPS = [
  { id: "", label: "All", tone: "slate" },
  { id: "P", label: "P \u2014 Steel", tone: "sky" },
  { id: "M", label: "M \u2014 Stainless", tone: "amber" },
  { id: "K", label: "K \u2014 Cast iron", tone: "slate" },
  { id: "N", label: "N \u2014 Non-ferrous", tone: "emerald" },
  { id: "S", label: "S \u2014 Superalloy", tone: "rose" },
  { id: "H", label: "H \u2014 Hardened", tone: "violet" }
];
function unwrapResults(response) {
  if (!response || typeof response !== "object") return [];
  const r = response;
  const data2 = r.result ?? r.data ?? r;
  if (!data2 || typeof data2 !== "object") return [];
  const d = data2;
  const items = d.results ?? d.materials ?? d.items;
  if (!Array.isArray(items)) return [];
  return items.filter((item) => !!item && typeof item === "object").map((item) => ({
    id: String(item.id ?? ""),
    name: String(item.name ?? item.label ?? ""),
    iso_group: String(item.iso_group ?? item.group ?? ""),
    kc1_1: Number(item.kc1_1 ?? item.kc ?? 0),
    mc: Number(item.mc ?? 0),
    hardness_HB: item.hardness_HB != null ? Number(item.hardness_HB) : item.hardness != null ? Number(item.hardness) : void 0,
    rec_vc: item.rec_vc != null ? Number(item.rec_vc) : void 0
  })).filter((m) => m.id && m.name);
}
function MaterialSearchPanel({ selected, onSelect }) {
  const [query, setQuery] = (0, import_react7.useState)("");
  const [groupFilter, setGroupFilter] = (0, import_react7.useState)("");
  const [results, setResults] = (0, import_react7.useState)([]);
  const [loading, setLoading] = (0, import_react7.useState)(false);
  const [searched, setSearched] = (0, import_react7.useState)(false);
  const doSearch = (0, import_react7.useCallback)(
    async (q) => {
      const fullQuery = groupFilter ? `${groupFilter} ${q}`.trim() : q;
      if (fullQuery.length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      setSearched(true);
      try {
        const res = await ppgMaterialSearch(fullQuery);
        setResults(unwrapResults(res));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [groupFilter]
  );
  const handleInput = (0, import_react7.useCallback)(
    (value) => {
      setQuery(value);
      const id = setTimeout(() => doSearch(value), 300);
      return () => clearTimeout(id);
    },
    [doSearch]
  );
  return /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "space-y-4", children: [
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { className: "flex flex-wrap gap-1.5", children: ISO_GROUPS.map((g) => /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
      "button",
      {
        onClick: () => {
          setGroupFilter(g.id);
          if (query.length >= 2) doSearch(query);
        },
        className: `rounded-full px-3 py-1 text-xs font-semibold transition ${groupFilter === g.id ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/30" : "text-slate-400 border border-white/6 bg-white/[0.02] hover:bg-white/[0.05]"}`,
        children: g.label
      },
      g.id
    )) }),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(Field, { label: "Search materials", children: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
      Input,
      {
        "aria-label": "Material search",
        value: query,
        onChange: (e) => handleInput(e.target.value),
        placeholder: "e.g. 4140, 6061, 304 stainless, titanium..."
      }
    ) }),
    selected && /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "rounded-[16px] border border-emerald-400/15 bg-emerald-400/[0.06] px-4 py-3", children: [
      /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "flex flex-wrap items-center gap-2", children: [
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "text-sm font-semibold text-emerald-300", children: selected.name }),
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(StatusPill, { label: `ISO ${selected.iso_group}`, tone: "emerald" }),
        selected.hardness_HB ? /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(StatusPill, { label: `${selected.hardness_HB} HB`, tone: "slate" }) : null
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "mt-1 text-xs text-emerald-400/70", children: [
        "kc1.1 = ",
        selected.kc1_1,
        " N/mm",
        "\xB2",
        " | mc = ",
        selected.mc,
        selected.rec_vc ? ` | Vc = ${selected.rec_vc} m/min` : ""
      ] })
    ] }),
    loading && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { className: "text-sm text-slate-400", children: "Searching..." }),
    results.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { className: "max-h-60 space-y-1 overflow-y-auto rounded-[16px] border border-white/6 bg-white/[0.01] p-2", children: results.map((mat) => /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(
      "button",
      {
        className: `w-full rounded-[12px] border px-3 py-2 text-left text-sm transition ${selected?.id === mat.id ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-200" : "border-transparent bg-transparent text-slate-300 hover:bg-white/[0.04]"}`,
        onClick: () => onSelect(mat),
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "font-semibold", children: mat.name }),
            /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("span", { className: "text-[10px] font-semibold uppercase tracking-wider text-slate-500", children: [
              "ISO ",
              mat.iso_group
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "mt-0.5 text-xs text-slate-500", children: [
            "kc1.1=",
            mat.kc1_1,
            " | mc=",
            mat.mc,
            mat.hardness_HB ? ` | ${mat.hardness_HB} HB` : "",
            mat.rec_vc ? ` | Vc=${mat.rec_vc} m/min` : ""
          ] })
        ]
      },
      mat.id
    )) }),
    searched && !loading && results.length === 0 && query.length >= 2 && /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "text-sm text-slate-500", children: [
      'No materials found for "',
      query,
      '"',
      groupFilter ? ` in ISO ${groupFilter}` : "",
      "."
    ] })
  ] });
}

// src/components/ppg/ToolConfigCard.tsx
var import_react8 = __toESM(require_react(), 1);
var import_jsx_runtime10 = __toESM(require_jsx_runtime(), 1);
var TOOL_TYPES = [
  { value: "flat_endmill", label: "Flat endmill" },
  { value: "ball_endmill", label: "Ball endmill" },
  { value: "bull_endmill", label: "Bull nose endmill" },
  { value: "drill", label: "Drill" },
  { value: "face_mill", label: "Face mill" },
  { value: "chamfer_mill", label: "Chamfer mill" },
  { value: "slot_drill", label: "Slot drill" },
  { value: "thread_mill", label: "Thread mill" },
  { value: "reamer", label: "Reamer" },
  { value: "tap", label: "Tap" },
  { value: "insert_mill", label: "Indexable mill" }
];
var TOOL_MATERIALS = [
  { value: "carbide", label: "Solid carbide" },
  { value: "hss", label: "HSS" },
  { value: "cobalt_hss", label: "Cobalt HSS" },
  { value: "ceramic", label: "Ceramic" },
  { value: "cbn", label: "CBN" },
  { value: "pcd", label: "PCD" },
  { value: "cermet", label: "Cermet" }
];
function unwrapToolResults(response) {
  if (!response || typeof response !== "object") return [];
  const r = response;
  const data2 = r.result ?? r.data ?? r;
  if (!data2 || typeof data2 !== "object") return [];
  const d = data2;
  const items = d.tools ?? d.results ?? d.items;
  if (!Array.isArray(items)) return [];
  return items.filter((item) => !!item && typeof item === "object").map((item) => ({
    id: String(item.id ?? item.catalog_id ?? ""),
    name: String(item.name ?? item.description ?? ""),
    type: String(item.type ?? item.tool_type ?? "flat_endmill"),
    diameter_mm: Number(item.diameter_mm ?? item.diameter ?? item.d ?? 0),
    flutes: Number(item.flutes ?? item.number_of_flutes ?? item.z ?? 0),
    material: String(item.material ?? item.substrate ?? "carbide"),
    coating: String(item.coating ?? item.coat ?? "none"),
    manufacturer: String(item.manufacturer ?? item.brand ?? item.mfr ?? ""),
    max_doc_mm: item.max_doc_mm != null ? Number(item.max_doc_mm) : void 0,
    max_rpm: item.max_rpm != null ? Number(item.max_rpm) : void 0
  })).filter((t) => t.id && t.name);
}
function ToolConfigCard({
  diameter,
  flutes,
  toolType,
  toolMaterial,
  onDiameterChange,
  onFlutesChange,
  onToolTypeChange,
  onToolMaterialChange,
  selectedTool,
  onSelectTool
}) {
  const [searchQuery, setSearchQuery] = (0, import_react8.useState)("");
  const [results, setResults] = (0, import_react8.useState)([]);
  const [loading, setLoading] = (0, import_react8.useState)(false);
  const [searched, setSearched] = (0, import_react8.useState)(false);
  const doSearch = (0, import_react8.useCallback)(async (q) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const res = await ppgToolSearch({ query: q, limit: 20 });
      setResults(unwrapToolResults(res));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);
  const handleSearchInput = (0, import_react8.useCallback)(
    (value) => {
      setSearchQuery(value);
      const id = setTimeout(() => doSearch(value), 300);
      return () => clearTimeout(id);
    },
    [doSearch]
  );
  const handleSelect = (0, import_react8.useCallback)(
    (tool) => {
      onSelectTool(tool);
      if (tool.diameter_mm > 0) onDiameterChange(String(tool.diameter_mm));
      if (tool.flutes > 0) onFlutesChange(String(tool.flutes));
      if (tool.type) onToolTypeChange(tool.type);
      if (tool.material) onToolMaterialChange(tool.material);
    },
    [onSelectTool, onDiameterChange, onFlutesChange, onToolTypeChange, onToolMaterialChange]
  );
  return /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "space-y-4", children: [
    /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(Field, { label: "Search tool catalog (75K+ tools)", children: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
      Input,
      {
        "aria-label": "Tool search",
        value: searchQuery,
        onChange: (e) => handleSearchInput(e.target.value),
        placeholder: "e.g. Sandvik CoroMill 390, Kennametal 12mm, Seco R217..."
      }
    ) }),
    selectedTool && /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "rounded-[16px] border border-cyan-400/15 bg-cyan-400/[0.06] px-4 py-3", children: [
      /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "flex flex-wrap items-center gap-2", children: [
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { className: "text-sm font-semibold text-cyan-300", children: selectedTool.name }),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(StatusPill, { label: selectedTool.manufacturer, tone: "sky" }),
        selectedTool.coating !== "none" && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(StatusPill, { label: selectedTool.coating, tone: "amber" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "mt-1 text-xs text-cyan-400/70", children: [
        "\xD8",
        selectedTool.diameter_mm,
        "mm | ",
        selectedTool.flutes,
        "F | ",
        selectedTool.material,
        selectedTool.max_doc_mm ? ` | max DoC ${selectedTool.max_doc_mm}mm` : ""
      ] })
    ] }),
    loading && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { className: "text-sm text-slate-400", children: "Searching tools..." }),
    results.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { className: "max-h-48 space-y-1 overflow-y-auto rounded-[16px] border border-white/6 bg-white/[0.01] p-2", children: results.map((tool) => /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(
      "button",
      {
        className: `w-full rounded-[12px] border px-3 py-2 text-left text-sm transition ${selectedTool?.id === tool.id ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-200" : "border-transparent bg-transparent text-slate-300 hover:bg-white/[0.04]"}`,
        onClick: () => handleSelect(tool),
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { className: "font-semibold", children: tool.name }),
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { className: "text-[10px] font-semibold uppercase tracking-wider text-slate-500", children: tool.manufacturer })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "mt-0.5 text-xs text-slate-500", children: [
            "\xD8",
            tool.diameter_mm,
            "mm | ",
            tool.flutes,
            "F | ",
            tool.material,
            tool.coating !== "none" ? ` | ${tool.coating}` : ""
          ] })
        ]
      },
      tool.id
    )) }),
    searched && !loading && results.length === 0 && searchQuery.length >= 2 && /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "text-sm text-slate-500", children: [
      'No tools found for "',
      searchQuery,
      '". Configure manually below.'
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "grid gap-3 sm:grid-cols-2", children: [
      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(Field, { label: "Tool diameter (mm)", children: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
        Input,
        {
          "aria-label": "Tool diameter",
          value: diameter,
          onChange: (e) => onDiameterChange(e.target.value),
          placeholder: "e.g. 12.7"
        }
      ) }),
      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(Field, { label: "Number of flutes", children: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
        Input,
        {
          "aria-label": "Flutes",
          value: flutes,
          onChange: (e) => onFlutesChange(e.target.value),
          placeholder: "e.g. 4"
        }
      ) }),
      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(Field, { label: "Tool type", children: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
        Select,
        {
          "aria-label": "Tool type",
          value: toolType,
          onChange: (e) => onToolTypeChange(e.target.value),
          children: TOOL_TYPES.map((t) => /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("option", { value: t.value, children: t.label }, t.value))
        }
      ) }),
      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(Field, { label: "Substrate", children: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
        Select,
        {
          "aria-label": "Tool material",
          value: toolMaterial,
          onChange: (e) => onToolMaterialChange(e.target.value),
          children: TOOL_MATERIALS.map((m) => /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("option", { value: m.value, children: m.label }, m.value))
        }
      ) })
    ] })
  ] });
}

// src/components/ppg/HolderSelectorPanel.tsx
var import_react9 = __toESM(require_react(), 1);
var import_jsx_runtime11 = __toESM(require_jsx_runtime(), 1);
var HOLDER_BRANDS = [
  { id: "", label: "All brands" },
  { id: "haimer", label: "HAIMER" },
  { id: "schunk", label: "SCHUNK" },
  { id: "big_kaiser", label: "BIG KAISER" },
  { id: "kennametal", label: "Kennametal" },
  { id: "sandvik", label: "Sandvik Coromant" },
  { id: "rego_fix", label: "REGO-FIX" },
  { id: "seco", label: "Seco" },
  { id: "iscar", label: "ISCAR" }
];
function tirTone(tir) {
  if (tir <= 3) return "emerald";
  if (tir <= 8) return "amber";
  return "rose";
}
function stiffnessLabel(s) {
  const map = {
    very_high: "Very high",
    high: "High",
    medium: "Medium",
    low: "Low"
  };
  return map[s] || s;
}
function unwrapHolderResults(response) {
  if (!response || typeof response !== "object") return [];
  const r = response;
  const data2 = r.result ?? r.data ?? r;
  if (!data2 || typeof data2 !== "object") return [];
  const d = data2;
  const items = d.holders ?? d.results ?? d.items;
  if (!Array.isArray(items)) return [];
  return items.filter((item) => !!item && typeof item === "object").map((item) => ({
    id: String(item.id ?? item.holder_id ?? ""),
    name: String(item.name ?? item.description ?? item.label ?? ""),
    brand: String(item.brand ?? item.manufacturer ?? ""),
    type: String(item.type ?? item.holder_type ?? ""),
    interface_type: String(item.interface_type ?? item.taper ?? item.interface ?? "CAT40"),
    tir_um: Number(item.tir_um ?? item.tir ?? item.runout_um ?? 5),
    stiffness: String(item.stiffness ?? item.rigidity ?? "medium"),
    max_rpm: Number(item.max_rpm ?? item.rpm_max ?? 2e4),
    balanced_grade: item.balanced_grade != null ? String(item.balanced_grade) : void 0
  })).filter((h) => h.id || h.name);
}
function HolderSelectorPanel({ selected, onSelect }) {
  const [brandFilter, setBrandFilter] = (0, import_react9.useState)("");
  const [searchQuery, setSearchQuery] = (0, import_react9.useState)("");
  const [results, setResults] = (0, import_react9.useState)([]);
  const [loading, setLoading] = (0, import_react9.useState)(false);
  const [loaded, setLoaded] = (0, import_react9.useState)(false);
  const loadHolders = (0, import_react9.useCallback)(async (brand) => {
    setLoading(true);
    try {
      const res = await ppgHolderCatalog({ brand: brand || void 0 });
      setResults(unwrapHolderResults(res));
      setLoaded(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);
  (0, import_react9.useEffect)(() => {
    loadHolders(brandFilter);
  }, [brandFilter, loadHolders]);
  const filtered = searchQuery.length >= 2 ? results.filter((h) => {
    const q = searchQuery.toLowerCase();
    return h.name.toLowerCase().includes(q) || h.brand.toLowerCase().includes(q) || h.type.toLowerCase().includes(q);
  }) : results;
  return /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "space-y-4", children: [
    /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("div", { className: "flex flex-wrap gap-1.5", children: HOLDER_BRANDS.map((b) => /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
      "button",
      {
        onClick: () => setBrandFilter(b.id),
        className: `rounded-full px-3 py-1 text-xs font-semibold transition ${brandFilter === b.id ? "bg-violet-500/20 text-violet-300 border border-violet-400/30" : "text-slate-400 border border-white/6 bg-white/[0.02] hover:bg-white/[0.05]"}`,
        children: b.label
      },
      b.id
    )) }),
    /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(Field, { label: "Filter holders", children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
      Input,
      {
        "aria-label": "Holder search",
        value: searchQuery,
        onChange: (e) => setSearchQuery(e.target.value),
        placeholder: "e.g. shrink fit, hydraulic, ER32..."
      }
    ) }),
    selected && /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "rounded-[16px] border border-violet-400/15 bg-violet-400/[0.06] px-4 py-3", children: [
      /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "flex flex-wrap items-center gap-2", children: [
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("span", { className: "text-sm font-semibold text-violet-300", children: selected.name }),
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(StatusPill, { label: selected.brand, tone: "violet" }),
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(StatusPill, { label: `TIR ${selected.tir_um}\xB5m`, tone: tirTone(selected.tir_um) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "mt-1 text-xs text-violet-400/70", children: [
        selected.interface_type,
        " | ",
        stiffnessLabel(selected.stiffness),
        " stiffness | ",
        selected.max_rpm.toLocaleString(),
        " RPM max",
        selected.balanced_grade ? ` | G${selected.balanced_grade}` : ""
      ] })
    ] }),
    loading && /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("div", { className: "text-sm text-slate-400", children: "Loading holders..." }),
    filtered.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("div", { className: "max-h-48 space-y-1 overflow-y-auto rounded-[16px] border border-white/6 bg-white/[0.01] p-2", children: filtered.map((holder, idx) => /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(
      "button",
      {
        className: `w-full rounded-[12px] border px-3 py-2 text-left text-sm transition ${selected?.id === holder.id ? "border-violet-400/30 bg-violet-500/10 text-violet-200" : "border-transparent bg-transparent text-slate-300 hover:bg-white/[0.04]"}`,
        onClick: () => onSelect(holder),
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("span", { className: "font-semibold", children: holder.name }),
            /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("span", { className: "text-[10px] font-semibold uppercase tracking-wider text-slate-500", children: holder.brand })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "mt-0.5 flex flex-wrap gap-2 text-xs text-slate-500", children: [
            /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("span", { children: [
              "TIR ",
              holder.tir_um,
              "\xB5",
              "m"
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("span", { children: stiffnessLabel(holder.stiffness) }),
            /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("span", { children: holder.interface_type }),
            /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("span", { children: [
              holder.max_rpm.toLocaleString(),
              " RPM"
            ] })
          ] })
        ]
      },
      holder.id || `holder-${idx}`
    )) }),
    loaded && !loading && filtered.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "text-sm text-slate-500", children: [
      "No holders found",
      searchQuery ? ` for "${searchQuery}"` : "",
      brandFilter ? ` from ${HOLDER_BRANDS.find((b) => b.id === brandFilter)?.label}` : "",
      "."
    ] })
  ] });
}

// src/components/ppg/GcodePreviewPanel.tsx
var import_react10 = __toESM(require_react(), 1);
var import_jsx_runtime12 = __toESM(require_jsx_runtime(), 1);
function classifyToken3(token) {
  if (/^\(.*\)$/.test(token) || token.startsWith(";")) return "comment";
  if (/^G\d+(\.\d+)?$/i.test(token)) return "gcode";
  if (/^M\d+$/i.test(token)) return "mcode";
  if (/^[SF]\d+(\.\d+)?$/i.test(token)) return "sfeed";
  if (/^[XYZABCIJKR]-?\d+(\.\d+)?$/i.test(token)) return "coord";
  if (/^[THDP]\d+$/i.test(token)) return "number";
  return "plain";
}
var TOKEN_COLORS = {
  gcode: "text-emerald-400",
  mcode: "text-sky-400",
  sfeed: "text-amber-300",
  comment: "text-slate-500 italic",
  coord: "text-cyan-300",
  number: "text-violet-300",
  plain: "text-slate-300"
};
function tokenizeLine(line) {
  const tokens = [];
  const trimmed = line.trimStart();
  if (trimmed.startsWith(";") || trimmed.startsWith("%")) {
    tokens.push({ text: line, type: "comment" });
    return tokens;
  }
  const commentMatch = line.match(/^(.*?)(\(.*\))(.*)$/);
  if (commentMatch) {
    if (commentMatch[1]) {
      tokens.push(...tokenizeSegment(commentMatch[1]));
    }
    tokens.push({ text: commentMatch[2], type: "comment" });
    if (commentMatch[3]) {
      tokens.push(...tokenizeSegment(commentMatch[3]));
    }
    return tokens;
  }
  return tokenizeSegment(line);
}
function tokenizeSegment(segment) {
  const tokens = [];
  const pattern = /([GMSFTHDPXYZABCIJKR]-?\d+(?:\.\d+)?|N\d+|%|\s+)/gi;
  let lastIndex = 0;
  for (const match of segment.matchAll(pattern)) {
    if (match.index > lastIndex) {
      tokens.push({ text: segment.slice(lastIndex, match.index), type: "plain" });
    }
    const word = match[0];
    if (/^\s+$/.test(word)) {
      tokens.push({ text: word, type: "plain" });
    } else {
      tokens.push({ text: word, type: classifyToken3(word) });
    }
    lastIndex = match.index + word.length;
  }
  if (lastIndex < segment.length) {
    tokens.push({ text: segment.slice(lastIndex), type: "plain" });
  }
  return tokens;
}
function GcodePreviewPanel({ code, title, maxLines = 1e3 }) {
  const [copied, setCopied] = (0, import_react10.useState)(false);
  const preRef = (0, import_react10.useRef)(null);
  const lines = (0, import_react10.useMemo)(() => {
    const allLines = code.split("\n");
    return allLines.slice(0, maxLines);
  }, [code, maxLines]);
  const totalLines = code.split("\n").length;
  const gCodeCount = (0, import_react10.useMemo)(() => lines.filter((l) => /\bG\d+/i.test(l)).length, [lines]);
  const mCodeCount = (0, import_react10.useMemo)(() => lines.filter((l) => /\bM\d+/i.test(l)).length, [lines]);
  const handleCopy = (0, import_react10.useCallback)(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2e3);
    } catch {
    }
  }, [code]);
  if (!code.trim()) {
    return /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { className: "rounded-[16px] border border-white/6 bg-white/[0.01] p-6 text-center text-sm text-slate-500", children: "No G-code to preview" });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "space-y-3", children: [
    /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "flex flex-wrap items-center justify-between gap-2", children: [
      /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "flex items-center gap-2", children: [
        title && /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { className: "text-sm font-semibold text-slate-300", children: title }),
        /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(StatusPill, { label: `${totalLines} lines`, tone: "slate" }),
        /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(StatusPill, { label: `${gCodeCount} G-codes`, tone: "emerald" }),
        /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(StatusPill, { label: `${mCodeCount} M-codes`, tone: "sky" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(ActionButton, { onClick: handleCopy, children: copied ? "Copied!" : "Copy to clipboard" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
      "div",
      {
        ref: preRef,
        className: "max-h-[500px] overflow-auto rounded-[16px] border border-white/6 bg-black/40 font-mono text-xs leading-5",
        children: /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("table", { className: "w-full border-collapse", children: /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("tbody", { children: lines.map((line, idx) => /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("tr", { className: "hover:bg-white/[0.03]", children: [
          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("td", { className: "select-none border-r border-white/6 px-3 py-0 text-right text-slate-600", children: idx + 1 }),
          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("td", { className: "whitespace-pre px-3 py-0", children: tokenizeLine(line).map((tok, tidx) => /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { className: TOKEN_COLORS[tok.type], children: tok.text }, tidx)) })
        ] }, idx)) }) })
      }
    ),
    totalLines > maxLines && /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "text-xs text-slate-500", children: [
      "Showing first ",
      maxLines,
      " of ",
      totalLines,
      " lines"
    ] })
  ] });
}

// src/pages/PostProcessorGeneratorPage.tsx
var import_jsx_runtime13 = __toESM(require_jsx_runtime(), 1);
var WIZARD_STEPS = [
  { step: 1, label: "Machine", icon: "\u2699", hint: "Pick your machine and controller" },
  { step: 2, label: "Material", icon: "\u25C6", hint: "Select workpiece material" },
  { step: 3, label: "Tools", icon: "\u2736", hint: "Configure tool and holder" },
  { step: 4, label: "CAM", icon: "\u25B6", hint: "Choose CAM system and strategy" },
  { step: 5, label: "Generate", icon: "\u2713", hint: "Build and download your post" }
];
var CAM_PACKAGES = [
  {
    value: "mastercam",
    label: "Mastercam",
    detail: "Broad shop-floor familiarity and stable legacy post posture."
  },
  {
    value: "hypermill",
    label: "hyperMILL",
    detail: "High-end automation and multiaxis controller nuance."
  },
  {
    value: "fusion_360",
    label: "Fusion 360",
    detail: "CPS-driven customization and modern cloud-linked workflows."
  },
  {
    value: "nx_cam",
    label: "NX CAM",
    detail: "Enterprise machine modeling and advanced post control."
  },
  {
    value: "esprit",
    label: "ESPRIT",
    detail: "Mill-turn and Swiss-focused programming posture."
  },
  {
    value: "solidcam",
    label: "SolidCAM",
    detail: "SolidWorks-integrated iMachining and mill-turn."
  },
  {
    value: "catia",
    label: "CATIA",
    detail: "Dassault V5/V6 enterprise machining packages."
  },
  {
    value: "gibbscam",
    label: "GibbsCAM",
    detail: "Production lathe and mill-turn shop posture."
  },
  {
    value: "manual",
    label: "Manual programming",
    detail: "Hand-built controller-specific code and edits."
  }
];
var MACHINE_POSTURES = [
  {
    value: "3_axis_vmc",
    label: "3-axis VMC",
    detail: "Safe starts, work offsets, and standard mill motion."
  },
  {
    value: "5_axis_trunnion",
    label: "5-axis trunnion",
    detail: "RTCP, pivot distance, and tilted workplane handling."
  },
  {
    value: "horizontal",
    label: "Horizontal mill",
    detail: "Pallet-ready production and deep tool management."
  },
  {
    value: "lathe",
    label: "Lathe / turning",
    detail: "Tool nose comp, canned cycles, and spindle mode control."
  },
  {
    value: "mill_turn",
    label: "Mill-turn",
    detail: "Sync marks, handoff posture, and live-tool sequencing."
  },
  {
    value: "swiss",
    label: "Swiss",
    detail: "Guide-bushing and gang/turret-aware sequencing."
  }
];
var FALLBACK_CONTROLLERS = [
  {
    value: "haas_ngc",
    label: "Haas NGC",
    family: "Mill / turning",
    note: "Readable code, probing-friendly, M97/M98 posture."
  },
  {
    value: "fanuc_31i",
    label: "Fanuc 31i",
    family: "Mill / multiaxis",
    note: "Macro-rich baseline for broad compatibility."
  },
  {
    value: "siemens_840d",
    label: "Siemens 840D",
    family: "5-axis / aerospace",
    note: "TRAORI and workplane-heavy post behavior."
  },
  {
    value: "heidenhain_tnc7",
    label: "Heidenhain TNC7",
    family: "5-axis / mold",
    note: "Cycle-rich conversational style."
  },
  {
    value: "okuma_p300",
    label: "Okuma P300",
    family: "Turning / mill-turn",
    note: "OSP-flavored cycles and sync posture."
  },
  {
    value: "mazatrol_smooth",
    label: "Mazatrol Smooth",
    family: "Mill-turn / production",
    note: "Mazak-specific cycle and axis behavior."
  }
];
var FALLBACK_OPERATIONS = [
  {
    value: "facing",
    label: "Facing",
    family: "Template post",
    note: "Safe start, tool call, and planar motion."
  },
  {
    value: "drilling",
    label: "Drilling",
    family: "Cycle template",
    note: "Canned cycles, retract logic, and coolant calls."
  },
  {
    value: "pocketing",
    label: "Pocketing",
    family: "Milling template",
    note: "Arc formatting and linking behavior."
  },
  {
    value: "thread_milling",
    label: "Thread milling",
    family: "Milling template",
    note: "Pitch logic and helical motion."
  },
  {
    value: "turning_profile",
    label: "Turning profile",
    family: "Turning template",
    note: "Tool nose comp and spindle mode."
  },
  {
    value: "mill_turn_sync",
    label: "Mill-turn sync",
    family: "Mill-turn program",
    note: "Channel choreography and handoff logic."
  },
  {
    value: "probing",
    label: "Probing",
    family: "Inspection template",
    note: "Offset write-back and setup verification."
  }
];
var CAPABILITY_OPTIONS = [
  {
    id: "safe_start",
    label: "Safe start discipline",
    detail: "Header, modal cleanup, and restart-safe sequencing should stay explicit and operator-readable."
  },
  {
    id: "macro_variables",
    label: "Macro variables",
    detail: "Needed for parameterized behavior, offset write-back, and controller-side logic."
  },
  {
    id: "probing_cycles",
    label: "Probing cycles",
    detail: "Supports setup verification, work offset confirmation, and in-process checks."
  },
  {
    id: "rotary_indexing",
    label: "Rotary / indexing",
    detail: "Required when the post must manage table motion, index locks, or positional axis calls.",
    relevantPostures: ["5_axis_trunnion", "horizontal"]
  },
  {
    id: "rtcp",
    label: "RTCP / TCPM",
    detail: "Needed when multiaxis motion depends on dynamic pivot control and tool-center-point math.",
    relevantPostures: ["5_axis_trunnion"]
  },
  {
    id: "tilted_workplane",
    label: "Tilted workplane",
    detail: "Ensures the post can emit controller-native workplane commands instead of unsafe angle hacks.",
    relevantPostures: ["5_axis_trunnion"]
  },
  {
    id: "high_speed_smoothing",
    label: "High-speed smoothing",
    detail: "Useful when the machine favors smoothing or look-ahead options for finish quality and motion control."
  },
  {
    id: "subprograms",
    label: "Subprogram support",
    detail: "Important for repeating patterns, pallet workflows, and readable long-run production output."
  },
  {
    id: "polar_c_axis",
    label: "Polar / C-axis interpolation",
    detail: "Required when turning centers or mill-turns blend live-tool motion with spindle orientation.",
    relevantPostures: ["lathe", "mill_turn", "swiss"],
    relevantOperations: ["turning_profile", "mill_turn_sync"]
  },
  {
    id: "sync_channels",
    label: "Sync channels / handoff",
    detail: "Required when the post must coordinate channels, subspindles, or mill-turn handoff marks.",
    relevantPostures: ["mill_turn", "swiss"],
    relevantOperations: ["mill_turn_sync"]
  }
];
var COVERAGE_TIERS = [
  {
    label: "Library Pack",
    price: "$149 setup",
    detail: "Generic controller starter with editable baseline output, revision notes, and a quick-fit handoff for lower-risk machines.",
    tone: "sky"
  },
  {
    label: "Machine-Ready",
    price: "$499 / machine",
    detail: "Controller tuning, safe-start cleanup, cycle review, and a machine-specific handoff for production-ready standard mills or lathes.",
    tone: "emerald"
  },
  {
    label: "Multiaxis / Mill-Turn",
    price: "$1,250 / machine",
    detail: "4-axis, 5-axis, probing, or mill-turn options with controller nuance, kinematic assumptions, and prove-out posture called out explicitly.",
    tone: "violet"
  },
  {
    label: "Cell-Certified",
    price: "$2,500+",
    detail: "Machine-specific optimization, prove-out support, setup-sheet alignment, and simulation-ready release posture for high-risk or high-value cells.",
    tone: "amber"
  }
];
var LANE_CONFIG = {
  generate: {
    label: "Generate",
    detail: "Build a post package from controller, CAM, and operation posture."
  },
  validate: {
    label: "Validate",
    detail: "Check a posted program for readiness and safety blocks."
  },
  compare: {
    label: "Compare",
    detail: "See where two controllers diverge before prove-out."
  },
  library: {
    label: "Library",
    detail: "Review controller coverage, tiering, and request posture."
  },
  machine: {
    label: "Machine",
    detail: "Auto-resolve controller and features from machine make/model/year."
  },
  programs: {
    label: "Programs",
    detail: "Browse real NC programs from your shop \u2014 load and optimize with PRISM physics."
  }
};
var DEFAULT_PROGRAM = `( PRISM POST REVIEW )
%
O1001
G90 G17 G40 G49 G80
G54
T1 M06
S8200 M03
G00 X0. Y0.
G43 H01 Z2.
M08
G01 Z-0.125 F35.
G03 X1.25 Y0.75 I0.625 J0. F85.
G00 Z2.
M09
M30
%`;
var ACTION_LINK_CLASS = "inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-cyan-300/24 hover:bg-cyan-300/[0.08]";
function sanitizeToken(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}
function formatTokenLabel(value) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (match) => match.toUpperCase());
}
function uniqueStrings(items) {
  return Array.from(new Set(items.filter(Boolean)));
}
function buildPostPacketId(input) {
  const tokens = [
    input.programName,
    input.controller,
    input.machinePosture,
    input.operation
  ].map(sanitizeToken).filter(Boolean);
  return tokens.length > 0 ? tokens.join("__") : "ppg_packet";
}
function readinessTone(status) {
  if (status === "ready") return "emerald";
  if (status === "blocked") return "rose";
  return "amber";
}
function readinessRing(status) {
  if (status === "ready") return "border-emerald-300/14 bg-emerald-300/[0.06]";
  if (status === "blocked") return "border-rose-300/14 bg-rose-300/[0.06]";
  return "border-amber-300/14 bg-amber-300/[0.06]";
}
function isCapabilityRelevant(option, machinePosture, operation) {
  const postureMatch = !option.relevantPostures || option.relevantPostures.includes(machinePosture);
  const operationMatch = !option.relevantOperations || option.relevantOperations.includes(operation);
  return postureMatch && operationMatch;
}
function unwrapPayload(response) {
  if (!response || typeof response !== "object") return null;
  const typed = response;
  const direct = typed.result ?? typed.data;
  if (Array.isArray(direct)) return direct;
  if (direct && typeof direct === "object") return direct;
  return typed;
}
function extractControllers(payload) {
  if (!payload) return FALLBACK_CONTROLLERS;
  if (Array.isArray(payload)) {
    const mapped2 = payload.filter((item) => typeof item === "string" && item.length > 0).map((item) => ({
      value: sanitizeToken(item),
      label: item,
      family: "Controller",
      note: "Loaded from backend controller catalog."
    }));
    return mapped2.length > 0 ? mapped2 : FALLBACK_CONTROLLERS;
  }
  const pool = payload.controllers ?? payload.supported_controllers ?? payload.items ?? [];
  if (!Array.isArray(pool)) return FALLBACK_CONTROLLERS;
  const mapped = pool.map((item) => {
    if (typeof item === "string") {
      return {
        value: sanitizeToken(item),
        label: item,
        family: "Controller",
        note: "Loaded from backend controller catalog."
      };
    }
    if (item && typeof item === "object") {
      const typed = item;
      const label = String(typed.name ?? typed.label ?? typed.controller ?? "");
      if (!label) return null;
      return {
        value: String(typed.id ?? typed.value ?? sanitizeToken(label)),
        label,
        family: String(typed.family ?? typed.type ?? "Controller"),
        note: String(
          typed.note ?? typed.description ?? "Loaded from backend controller catalog."
        )
      };
    }
    return null;
  }).filter((item) => Boolean(item));
  return mapped.length > 0 ? mapped : FALLBACK_CONTROLLERS;
}
function extractOperations(payload) {
  if (!payload) return FALLBACK_OPERATIONS;
  if (Array.isArray(payload)) {
    const mapped2 = payload.filter((item) => typeof item === "string" && item.length > 0).map((item) => ({
      value: sanitizeToken(item),
      label: formatTokenLabel(item),
      family: "Backend template",
      note: "Loaded from backend operation catalog."
    }));
    return mapped2.length > 0 ? mapped2 : FALLBACK_OPERATIONS;
  }
  const pool = payload.operations ?? payload.templates ?? payload.supported_operations ?? [];
  if (!Array.isArray(pool)) return FALLBACK_OPERATIONS;
  const mapped = pool.map((item) => {
    if (typeof item === "string") {
      return {
        value: sanitizeToken(item),
        label: formatTokenLabel(item),
        family: "Backend template",
        note: "Loaded from backend operation catalog."
      };
    }
    if (item && typeof item === "object") {
      const typed = item;
      const raw = String(typed.operation ?? typed.name ?? typed.label ?? "");
      if (!raw) return null;
      return {
        value: sanitizeToken(raw),
        label: formatTokenLabel(raw),
        family: String(typed.family ?? "Backend template"),
        note: String(
          typed.note ?? typed.description ?? "Loaded from backend operation catalog."
        )
      };
    }
    return null;
  }).filter((item) => Boolean(item));
  return mapped.length > 0 ? mapped : FALLBACK_OPERATIONS;
}
function getRequiredCapabilityIds(machinePosture, operation) {
  const ids = /* @__PURE__ */ new Set(["safe_start", "macro_variables"]);
  if (machinePosture === "5_axis_trunnion") {
    ids.add("rotary_indexing");
    ids.add("rtcp");
    ids.add("tilted_workplane");
  }
  if (machinePosture === "horizontal") ids.add("subprograms");
  if (machinePosture === "mill_turn") {
    ids.add("polar_c_axis");
    ids.add("sync_channels");
  }
  if (machinePosture === "swiss") ids.add("subprograms");
  if (operation === "probing") ids.add("probing_cycles");
  if (operation === "mill_turn_sync") ids.add("sync_channels");
  if (operation === "turning_profile" && (machinePosture === "lathe" || machinePosture === "mill_turn")) {
    ids.add("polar_c_axis");
  }
  return Array.from(ids);
}
function buildRecommendedCapabilityIds(machinePosture, strategy, operation) {
  const recommended = /* @__PURE__ */ new Set(["safe_start", "subprograms"]);
  if (strategy !== "prove_out") recommended.add("macro_variables");
  if (strategy === "production_safe" || strategy === "prove_out" || operation === "probing") {
    recommended.add("probing_cycles");
  }
  if (machinePosture === "5_axis_trunnion") {
    recommended.add("rotary_indexing");
    recommended.add("rtcp");
    recommended.add("tilted_workplane");
    recommended.add("high_speed_smoothing");
  }
  if (machinePosture === "horizontal") recommended.add("rotary_indexing");
  if (machinePosture === "lathe" || machinePosture === "mill_turn" || machinePosture === "swiss") {
    recommended.add("polar_c_axis");
  }
  if (machinePosture === "mill_turn" || machinePosture === "swiss" || operation === "mill_turn_sync") {
    recommended.add("sync_channels");
  }
  if (operation === "thread_milling" || operation === "pocketing") {
    recommended.add("high_speed_smoothing");
  }
  return Array.from(recommended);
}
function buildCapabilitySeed(machinePosture, operation, strategy, providedIds = []) {
  return uniqueStrings([
    "safe_start",
    "macro_variables",
    "subprograms",
    ...providedIds,
    ...getRequiredCapabilityIds(machinePosture, operation),
    ...buildRecommendedCapabilityIds(machinePosture, strategy, operation)
  ]);
}
function buildSelectedCapabilityDetails(selectedIds, machinePosture, operation, controllerLabel, operationLabel) {
  return CAPABILITY_OPTIONS.filter((option) => selectedIds.includes(option.id)).map(
    (option) => {
      const relevant = isCapabilityRelevant(option, machinePosture, operation);
      const status = !relevant ? "review" : option.id === "rtcp" || option.id === "tilted_workplane" || option.id === "sync_channels" ? "review" : "ready";
      return {
        ...option,
        relevant,
        status,
        summary: !relevant ? `${option.label} is captured, but it is not a primary driver for the current ${controllerLabel} / ${operationLabel} posture.` : `${option.label} is staged for this ${controllerLabel} packet and will be carried into downstream prove-out actions.`
      };
    }
  );
}
function buildReleaseChecks(input) {
  const hasSafeStart = input.selectedCapabilityIds.includes("safe_start");
  const hasSimulationRisk = input.missingRequired.some(
    (item) => ["rtcp", "tilted_workplane", "sync_channels"].includes(item.id)
  ) || !input.comparison && (input.machinePosture === "5_axis_trunnion" || input.machinePosture === "mill_turn" || input.machinePosture === "swiss");
  const checks = [
    {
      id: "capabilities",
      label: "Capability gate",
      status: input.missingRequired.length > 0 ? "blocked" : input.missingRecommended.length > 0 ? "review" : "ready",
      detail: input.missingRequired.length > 0 ? `Missing required machine or controller gates: ${input.missingRequired.map((item) => item.label).join(", ")}.` : input.missingRecommended.length > 0 ? `Recommended checks still worth confirming: ${input.missingRecommended.map((item) => item.label).join(", ")}.` : `Machine posture and controller features look aligned for this ${input.machinePostureLabel} packet.`
    },
    {
      id: "prove_out",
      label: "Operator prove-out",
      status: !input.generated || !hasSafeStart ? "blocked" : input.validation?.status === "ready" ? "ready" : "review",
      detail: !input.generated || !hasSafeStart ? "Generate the post with safe-start discipline before promising a floor prove-out path." : input.validation?.status === "ready" ? "Safe start, offsets, and end blocks are present enough for an operator-first prove-out." : "Readable output exists, but validation still needs attention before the floor sees it."
    },
    {
      id: "simulation",
      label: "Simulation and collision review",
      status: hasSimulationRisk ? "blocked" : input.comparison ? "ready" : "review",
      detail: hasSimulationRisk ? "Current posture still needs multiaxis or sync-specific controller review before simulation trust is credible." : input.comparison ? "Controller delta review is staged, so simulation and collision posture are easier to trust." : "Run a controller comparison before treating the post as simulation-ready."
    },
    {
      id: "release",
      label: "Release handoff",
      status: input.generated && input.validation ? input.validation.status === "ready" ? "ready" : "review" : "review",
      detail: input.generated && input.validation ? "The post desk has enough structure to hand off into Print to CNC, quoting, and shop-floor follow-up." : "Build the post and at least one validation pass so downstream desks inherit more than raw controller selections."
    }
  ];
  return checks;
}
function buildLocalGeneratedOutput(input) {
  return {
    post_name: input.programName,
    controller: input.controllerLabel,
    cam_system: input.camLabel,
    operation: input.operationLabel,
    machine_model: input.machineModel,
    estimated_lines: 164,
    optimization_package: `${input.machinePostureLabel} release packet`,
    capabilities: uniqueStrings([
      "Safe start block",
      "Modal cleanup",
      "Controller-tailored headers",
      "Release packet continuity",
      ...input.selectedCapabilityLabels
    ]),
    preview: `( ${input.programName} )
%
O9024
( CAM: ${input.camLabel} )
( CTRL: ${input.controllerLabel} )
( OP: ${input.operationLabel} )
G90 G17 G40 G49 G80
G54
T01 M06
S7200 M03
G00 G43 H01 Z2.
M08
G01 Z-0.2 F28.
X2.5 Y1.25 F92.
G03 X3.25 Y2. I0.4 J0.3
G00 Z2.
M09
M30
%`
  };
}
function buildLocalValidationOutput(controllerLabel, gcodeInput, releaseChecks) {
  const warnings = [];
  const passes = [];
  if (!gcodeInput.trim()) warnings.push("Program text is blank.");
  if (!/G90/i.test(gcodeInput)) warnings.push("Missing absolute mode (G90) in header.");
  else passes.push("Absolute positioning found.");
  if (!/G54|G55|G56|G57/i.test(gcodeInput)) warnings.push("No work offset call detected.");
  else passes.push("Work offset call detected.");
  if (!/M30|M02/i.test(gcodeInput)) warnings.push("Program end block is missing.");
  else passes.push("Program end block detected.");
  if (!/M08|M07/i.test(gcodeInput)) warnings.push("Coolant call not found; verify manual intent.");
  else passes.push("Coolant call detected.");
  if (gcodeInput.trim().split("\n").filter(Boolean).length < 5) {
    warnings.push("Program looks unusually short for a prove-out packet.");
  }
  releaseChecks.forEach((check) => {
    if (check.status === "ready") passes.push(check.label);
    else warnings.push(check.detail);
  });
  const mergedWarnings = uniqueStrings(warnings);
  const mergedPasses = uniqueStrings(passes);
  const status = mergedWarnings.length === 0 ? "ready" : mergedWarnings.length <= 3 ? "review" : "blocked";
  const score = Math.max(0.42, Math.min(0.98, mergedPasses.length * 0.16 + 0.12));
  return {
    status,
    score,
    warnings: mergedWarnings,
    passes: mergedPasses,
    controller: controllerLabel
  };
}
function buildLocalComparisonOutput(baseline, target, machinePosture) {
  const delta = [
    `${target} needs different canned-cycle syntax than ${baseline}.`,
    `${target} prefers a different modal header discipline than ${baseline}.`
  ];
  if (machinePosture === "5_axis_trunnion") {
    delta.push(`${target} should be reviewed for RTCP / tilted-workplane behavior before release.`);
  }
  if (machinePosture === "mill_turn" || machinePosture === "swiss") {
    delta.push(`${target} should be reviewed for sync-channel and handoff posture before release.`);
  }
  return {
    baseline,
    target,
    delta_summary: uniqueStrings(delta),
    baseline_notes: [
      "Legacy-friendly block structure",
      "Predictable prove-out edits",
      "Readable operator handoff"
    ],
    target_notes: [
      "Cleaner native cycles",
      "Higher-end motion support",
      "Better controller-specific optimization"
    ]
  };
}
function resolvePpgMachinePosture(rawMachinePosture, workspaceContext) {
  if (rawMachinePosture && MACHINE_POSTURES.some((item) => item.value === rawMachinePosture)) {
    return rawMachinePosture;
  }
  const source = `${workspaceContext?.mode ?? ""} ${workspaceContext?.machineKinematics ?? ""}`.trim().toLowerCase();
  if (source.includes("lathe") || source.includes("turn")) {
    return "lathe";
  }
  if (source.includes("mill-turn") || source.includes("mill turn")) {
    return "mill_turn";
  }
  if (source.includes("swiss")) {
    return "swiss";
  }
  if (source.includes("horizontal")) {
    return "horizontal";
  }
  if (source.includes("5-axis") || source.includes("5 axis") || source.includes("trunnion")) {
    return "5_axis_trunnion";
  }
  return "";
}
function resolvePpgMaterialIso(rawMaterialGroup, rawMaterialName, workspaceContext) {
  const source = `${rawMaterialGroup ?? ""} ${rawMaterialName ?? ""} ${workspaceContext?.materialGroup ?? ""} ${workspaceContext?.materialLabel ?? ""}`.trim().toLowerCase();
  if (!source) {
    return "";
  }
  if (source.includes("stainless")) {
    return "M";
  }
  if (source.includes("cast")) {
    return "K";
  }
  if (source.includes("aluminum") || source.includes("aluminium") || source.includes("brass") || source.includes("copper") || source.includes("non-ferrous")) {
    return "N";
  }
  if (source.includes("super alloy") || source.includes("superalloy") || source.includes("titanium") || source.includes("inconel") || source.includes("nickel") || source.includes("hastelloy")) {
    return "S";
  }
  if (source.includes("hard")) {
    return "H";
  }
  return "P";
}
function resolvePpgControllerValue(rawController, workspaceContext, controllers) {
  const sources = [
    rawController,
    workspaceContext?.controllerId,
    workspaceContext?.controllerLabel
  ].filter((value) => Boolean(value)).map((value) => sanitizeToken(value));
  if (sources.length === 0) {
    return "";
  }
  for (const source of sources) {
    const exact = controllers.find(
      (item) => sanitizeToken(item.value) === source || sanitizeToken(item.label) === source
    );
    if (exact) {
      return exact.value;
    }
  }
  for (const source of sources) {
    const partial = controllers.find((item) => {
      const haystack = sanitizeToken(`${item.value} ${item.label} ${item.family}`);
      return haystack.includes(source) || source.includes(sanitizeToken(item.value));
    });
    if (partial) {
      return partial.value;
    }
  }
  return "";
}
function PostProcessorGeneratorPage() {
  const location = useLocation();
  const locationState = location.state ?? null;
  const workspaceContext = locationState?.workspaceContext;
  const routeParams = (0, import_react11.useMemo)(() => new URLSearchParams(location.search), [location.search]);
  const routeContext = (0, import_react11.useMemo)(
    () => parseWorkflowRouteContext(location.search),
    [location.search]
  );
  const [pageMode, setPageMode] = (0, import_react11.useState)("lanes");
  const [wizardStep, setWizardStep] = (0, import_react11.useState)(1);
  const [lane, setLane] = (0, import_react11.useState)("generate");
  const [camSystem, setCamSystem] = (0, import_react11.useState)("fusion_360");
  const [machinePosture, setMachinePosture] = (0, import_react11.useState)("3_axis_vmc");
  const [controller, setController] = (0, import_react11.useState)("haas_ngc");
  const [compareTarget, setCompareTarget] = (0, import_react11.useState)("fanuc_31i");
  const [operation, setOperation] = (0, import_react11.useState)("facing");
  const [machineModel, setMachineModel] = (0, import_react11.useState)("Haas VF-2SS");
  const [programName, setProgramName] = (0, import_react11.useState)("PRISM_VF2_PRODUCTION");
  const [strategy, setStrategy] = (0, import_react11.useState)("ai_enhanced");
  const [notes, setNotes] = (0, import_react11.useState)(
    "Bias for safe startup, readable blocks, and prove-out clarity."
  );
  const [gcodeInput, setGcodeInput] = (0, import_react11.useState)(DEFAULT_PROGRAM);
  const [selectedCapabilityIds, setSelectedCapabilityIds] = (0, import_react11.useState)(
    buildCapabilitySeed("3_axis_vmc", "facing", "ai_enhanced")
  );
  const [controllers, setControllers] = (0, import_react11.useState)(FALLBACK_CONTROLLERS);
  const [operations, setOperations] = (0, import_react11.useState)(FALLBACK_OPERATIONS);
  const [generated, setGenerated] = (0, import_react11.useState)(null);
  const [validation, setValidation] = (0, import_react11.useState)(null);
  const [comparison, setComparison] = (0, import_react11.useState)(null);
  const [loadingCatalog, setLoadingCatalog] = (0, import_react11.useState)(false);
  const [loadingAction, setLoadingAction] = (0, import_react11.useState)(false);
  const [error, setError] = (0, import_react11.useState)(null);
  const [fingerprint, setFingerprint] = (0, import_react11.useState)(null);
  const [enabledFeatures, setEnabledFeatures] = (0, import_react11.useState)(/* @__PURE__ */ new Set());
  const [controllerOverride, setControllerOverride] = (0, import_react11.useState)("");
  const [proveOutEnabled, setProveOutEnabled] = (0, import_react11.useState)(false);
  const [proveOutResult, setProveOutResult] = (0, import_react11.useState)(null);
  const [validationResult, setValidationResult] = (0, import_react11.useState)(null);
  const [fileName, setFileName] = (0, import_react11.useState)("");
  const [fileSize, setFileSize] = (0, import_react11.useState)(0);
  const [isDragOver, setIsDragOver] = (0, import_react11.useState)(false);
  const [copySuccess, setCopySuccess] = (0, import_react11.useState)(false);
  const [detectedController, setDetectedController] = (0, import_react11.useState)(null);
  const [detectedConfidence, setDetectedConfidence] = (0, import_react11.useState)("");
  const [showDiff, setShowDiff] = (0, import_react11.useState)(false);
  const [originalGcode, setOriginalGcode] = (0, import_react11.useState)("");
  const [history, setHistory] = (0, import_react11.useState)([]);
  const [historyLoading, setHistoryLoading] = (0, import_react11.useState)(false);
  const [selectedMaterialId, setSelectedMaterialId] = (0, import_react11.useState)("");
  const [selectedMaterialName, setSelectedMaterialName] = (0, import_react11.useState)("");
  const [selectedMaterialIso, setSelectedMaterialIso] = (0, import_react11.useState)("");
  const [selectedMaterialKc, setSelectedMaterialKc] = (0, import_react11.useState)(0);
  const [selectedMaterialMc, setSelectedMaterialMc] = (0, import_react11.useState)(0);
  const [materialSearchResults, setMaterialSearchResults] = (0, import_react11.useState)([]);
  const [materialSearchQuery, setMaterialSearchQuery] = (0, import_react11.useState)("");
  const [toolDiameter, setToolDiameter] = (0, import_react11.useState)("10");
  const [toolFlutes, setToolFlutes] = (0, import_react11.useState)("4");
  const [toolType, setToolType] = (0, import_react11.useState)("flat_endmill");
  const [toolMaterial, setToolMaterial] = (0, import_react11.useState)("carbide");
  const [selectedTool, setSelectedTool] = (0, import_react11.useState)(null);
  const [selectedHolder, setSelectedHolder] = (0, import_react11.useState)(null);
  const [sfPreview, setSfPreview] = (0, import_react11.useState)(null);
  const [sfPreviewLoading, setSfPreviewLoading] = (0, import_react11.useState)(false);
  const [pipelineResult, setPipelineResult] = (0, import_react11.useState)(null);
  const [pipelineStages, setPipelineStages] = (0, import_react11.useState)([]);
  const [outputMode, setOutputMode] = (0, import_react11.useState)("pipeline_optimized");
  const [programController, setProgramController] = (0, import_react11.useState)("okuma");
  const [programSearch, setProgramSearch] = (0, import_react11.useState)("");
  const [programList, setProgramList] = (0, import_react11.useState)([]);
  const [programTotal, setProgramTotal] = (0, import_react11.useState)(0);
  const [programStats, setProgramStats] = (0, import_react11.useState)({});
  const [programLoading, setProgramLoading] = (0, import_react11.useState)(false);
  const routedSourceLabel = locationState?.sourceLabel ?? "the routed machine workspace";
  const routedMachineModel = locationState?.machineModel ?? workspaceContext?.machineLabel ?? "";
  const routedMaterialName = locationState?.materialName ?? workspaceContext?.materialLabel ?? "";
  const routedMaterialGroup = locationState?.materialGroup ?? workspaceContext?.materialGroup ?? "";
  const routedMachinePosture = (0, import_react11.useMemo)(
    () => resolvePpgMachinePosture(locationState?.machinePosture, workspaceContext),
    [locationState?.machinePosture, workspaceContext]
  );
  const routedMaterialIso = (0, import_react11.useMemo)(
    () => resolvePpgMaterialIso(routedMaterialGroup, routedMaterialName, workspaceContext),
    [routedMaterialGroup, routedMaterialName, workspaceContext]
  );
  const routedControllerValue = (0, import_react11.useMemo)(
    () => resolvePpgControllerValue(locationState?.controller, workspaceContext, controllers),
    [controllers, locationState?.controller, workspaceContext]
  );
  const routedControllerLabel = locationState?.controller ?? workspaceContext?.controllerLabel ?? workspaceContext?.controllerId ?? "";
  const controllerWasMapped = Boolean(
    routedControllerLabel && routedControllerValue && sanitizeToken(routedControllerLabel) !== sanitizeToken(routedControllerValue)
  );
  (0, import_react11.useEffect)(() => {
    const params = new URLSearchParams(location.search);
    const nextOperation = sanitizeToken(params.get("operation") || operation);
    const nextController = sanitizeToken(params.get("controller") || controller);
    const nextMachinePosture = sanitizeToken(
      params.get("machinePosture") || machinePosture
    );
    const providedCapabilities = (params.get("capabilities") || "").split(",").map((item) => sanitizeToken(item)).filter(Boolean);
    setOperation(nextOperation);
    setController(nextController);
    setMachinePosture(nextMachinePosture);
    setSelectedCapabilityIds(
      buildCapabilitySeed(
        nextMachinePosture,
        nextOperation,
        strategy,
        providedCapabilities
      )
    );
    let active = true;
    async function loadCatalog() {
      setLoadingCatalog(true);
      try {
        const [controllerResponse, operationResponse] = await Promise.all([
          ppgControllers(),
          ppgOperations()
        ]);
        if (!active) return;
        setControllers(extractControllers(unwrapPayload(controllerResponse)));
        setOperations(extractOperations(unwrapPayload(operationResponse)));
      } catch {
        if (!active) return;
        setControllers(FALLBACK_CONTROLLERS);
        setOperations(FALLBACK_OPERATIONS);
      } finally {
        if (active) setLoadingCatalog(false);
      }
    }
    void loadCatalog();
    return () => {
      active = false;
    };
  }, [location.search]);
  (0, import_react11.useEffect)(() => {
    if (!controllers.some((item) => item.value === controller)) {
      setController(controllers[0]?.value ?? FALLBACK_CONTROLLERS[0].value);
    }
  }, [controller, controllers]);
  (0, import_react11.useEffect)(() => {
    if (!operations.some((item) => item.value === operation)) {
      setOperation(operations[0]?.value ?? FALLBACK_OPERATIONS[0].value);
    }
  }, [operation, operations]);
  (0, import_react11.useEffect)(() => {
    if (routedMachinePosture) {
      setMachinePosture(routedMachinePosture);
    }
    if (routedControllerValue) {
      setController(routedControllerValue);
    }
    if (routedMachineModel) {
      setMachineModel(routedMachineModel);
    }
    if (routedMaterialName) {
      setSelectedMaterialName(routedMaterialName);
      setMaterialSearchQuery(routedMaterialName);
      setSelectedMaterialId(`routed-${sanitizeToken(routedMaterialName)}`);
      setSelectedMaterialIso(routedMaterialIso);
    }
  }, [
    routedControllerValue,
    routedMachineModel,
    routedMachinePosture,
    routedMaterialIso,
    routedMaterialName
  ]);
  const activeLane = LANE_CONFIG[lane];
  const selectedCam = (0, import_react11.useMemo)(
    () => CAM_PACKAGES.find((item) => item.value === camSystem) ?? CAM_PACKAGES[0],
    [camSystem]
  );
  const selectedMachinePosture = (0, import_react11.useMemo)(
    () => MACHINE_POSTURES.find((item) => item.value === machinePosture) ?? MACHINE_POSTURES[0],
    [machinePosture]
  );
  const selectedController = (0, import_react11.useMemo)(
    () => controllers.find((item) => item.value === controller) ?? FALLBACK_CONTROLLERS[0],
    [controller, controllers]
  );
  const selectedOperation = (0, import_react11.useMemo)(
    () => operations.find((item) => item.value === operation) ?? FALLBACK_OPERATIONS[0],
    [operation, operations]
  );
  const compareTargets = (0, import_react11.useMemo)(
    () => controllers.filter((item) => item.value !== controller),
    [controller, controllers]
  );
  const selectedCompareTarget = (0, import_react11.useMemo)(
    () => compareTargets.find((item) => item.value === compareTarget) ?? compareTargets[0] ?? FALLBACK_CONTROLLERS[1],
    [compareTarget, compareTargets]
  );
  (0, import_react11.useEffect)(() => {
    if (compareTargets.length > 0 && !compareTargets.some((item) => item.value === compareTarget)) {
      setCompareTarget(compareTargets[0].value);
    }
  }, [compareTarget, compareTargets]);
  (0, import_react11.useEffect)(() => {
    if (lane !== "programs" || Object.keys(programStats).length > 0) return;
    (async () => {
      setProgramLoading(true);
      try {
        const statsRes = await ppgProgramsStats();
        const statsData = statsRes?.data?.controllers ?? {};
        setProgramStats(statsData);
        const firstCtrl = Object.entries(statsData).sort((a, b) => b[1] - a[1])[0];
        if (firstCtrl) {
          setProgramController(firstCtrl[0]);
          const listRes = await ppgProgramsList(firstCtrl[0], 0, 50);
          const d = listRes?.data ?? {};
          setProgramList(d.programs ?? []);
          setProgramTotal(d.total ?? 0);
        }
      } catch {
      }
      setProgramLoading(false);
    })();
  }, [lane, programStats]);
  const requiredCapabilityIds = (0, import_react11.useMemo)(
    () => getRequiredCapabilityIds(machinePosture, operation),
    [machinePosture, operation]
  );
  const recommendedCapabilityIds = (0, import_react11.useMemo)(
    () => buildRecommendedCapabilityIds(machinePosture, strategy, operation),
    [machinePosture, operation, strategy]
  );
  const visibleCapabilities = (0, import_react11.useMemo)(
    () => CAPABILITY_OPTIONS.filter(
      (option) => selectedCapabilityIds.includes(option.id) || requiredCapabilityIds.includes(option.id) || recommendedCapabilityIds.includes(option.id) || isCapabilityRelevant(option, machinePosture, operation)
    ),
    [machinePosture, operation, recommendedCapabilityIds, requiredCapabilityIds, selectedCapabilityIds]
  );
  const selectedCapabilityDetails = (0, import_react11.useMemo)(
    () => buildSelectedCapabilityDetails(
      selectedCapabilityIds,
      machinePosture,
      operation,
      selectedController.label,
      selectedOperation.label
    ),
    [machinePosture, operation, selectedCapabilityIds, selectedController.label, selectedOperation.label]
  );
  const missingRequired = (0, import_react11.useMemo)(
    () => CAPABILITY_OPTIONS.filter(
      (option) => requiredCapabilityIds.includes(option.id) && !selectedCapabilityIds.includes(option.id)
    ),
    [requiredCapabilityIds, selectedCapabilityIds]
  );
  const missingRecommended = (0, import_react11.useMemo)(
    () => CAPABILITY_OPTIONS.filter(
      (option) => recommendedCapabilityIds.includes(option.id) && !selectedCapabilityIds.includes(option.id)
    ),
    [recommendedCapabilityIds, selectedCapabilityIds]
  );
  const releaseChecks = (0, import_react11.useMemo)(
    () => buildReleaseChecks({
      machinePosture,
      machinePostureLabel: selectedMachinePosture.label,
      selectedCapabilityIds,
      missingRequired,
      missingRecommended,
      generated,
      validation,
      comparison
    }),
    [
      comparison,
      generated,
      machinePosture,
      missingRecommended,
      missingRequired,
      selectedCapabilityIds,
      selectedMachinePosture.label,
      validation
    ]
  );
  const readinessSummary = (0, import_react11.useMemo)(() => {
    if (releaseChecks.some((item) => item.status === "blocked")) return "Blocked";
    if (releaseChecks.some((item) => item.status === "review")) return "Review";
    return "Ready";
  }, [releaseChecks]);
  const packetId = (0, import_react11.useMemo)(
    () => buildPostPacketId({
      programName,
      controller,
      machinePosture,
      operation
    }),
    [controller, machinePosture, operation, programName]
  );
  const recommendedTier = (0, import_react11.useMemo)(() => {
    const highRisk = machinePosture === "5_axis_trunnion" || machinePosture === "mill_turn" || machinePosture === "swiss";
    if (highRisk && validation?.status === "ready" && comparison) {
      return "Cell-Certified";
    }
    if (highRisk || strategy === "multi_operation") {
      return "Multiaxis / Mill-Turn";
    }
    if (strategy === "production_safe" || strategy === "prove_out" || operation === "probing") {
      return "Machine-Ready";
    }
    return "Library Pack";
  }, [comparison, machinePosture, operation, strategy, validation?.status]);
  const sourceContext = routeParams.get("source") || routeContext.origin.source;
  const upstreamCommercialSource = routeContext.origin.source && routeContext.origin.source !== sourceContext ? routeContext.origin.source : "";
  const sourceContextLabel = (0, import_react11.useMemo)(
    () => formatWorkflowSourceLabel(sourceContext),
    [sourceContext]
  );
  const upstreamSourceLabel = (0, import_react11.useMemo)(
    () => formatWorkflowSourceLabel(upstreamCommercialSource),
    [upstreamCommercialSource]
  );
  const upstreamRecordLabel = [routeContext.origin.recordType, routeContext.origin.recordId].filter(Boolean).join(" \xB7 ");
  const postFocus = (0, import_react11.useMemo)(
    () => routeContext.focus.id ? routeContext.focus : {
      type: "packet",
      id: packetId,
      packetId,
      jobId: "",
      quoteId: ""
    },
    [packetId, routeContext.focus]
  );
  const effectiveOrigin = (0, import_react11.useMemo)(
    () => routeContext.origin.source ? routeContext.origin : {
      source: "ppg",
      recordType: "Post Packet",
      recordId: packetId,
      customer: routeContext.origin.customer,
      note: routeContext.origin.note || "Carry post build, prove-out, and controller review posture into downstream desks.",
      threadId: routeContext.origin.threadId
    },
    [packetId, routeContext.origin]
  );
  const releasePath = (0, import_react11.useMemo)(
    () => buildWorkflowPath("/print-to-cnc", location.search, {
      origin: effectiveOrigin,
      focus: postFocus,
      extras: {
        source: "ppg",
        controller: selectedController.label,
        machinePosture,
        operation: selectedOperation.label,
        cam: selectedCam.label
      }
    }),
    [
      effectiveOrigin,
      location.search,
      machinePosture,
      postFocus,
      selectedCam.label,
      selectedController.label,
      selectedOperation.label
    ]
  );
  const quotePath = (0, import_react11.useMemo)(
    () => buildWorkflowPath("/quote-builder", location.search, {
      origin: effectiveOrigin,
      focus: postFocus,
      extras: {
        source: "ppg",
        operation: selectedOperation.label,
        note: "Carry controller and prove-out posture into quoting."
      }
    }),
    [effectiveOrigin, location.search, postFocus, selectedOperation.label]
  );
  const capturePath = (0, import_react11.useMemo)(
    () => buildCapturePath(location.pathname, location.search, {
      source: "ppg",
      target: "machine",
      job: programName,
      department: "Programming",
      machine: machineModel,
      note: "Capture prove-out video, controller evidence, setup photos, and operator notes for this post package.",
      origin: effectiveOrigin,
      focus: postFocus
    }),
    [
      effectiveOrigin,
      location.pathname,
      location.search,
      machineModel,
      postFocus,
      programName
    ]
  );
  const shopFloorPath = (0, import_react11.useMemo)(
    () => buildShopFloorPath(location.pathname, location.search, {
      source: "ppg",
      job: programName,
      department: "Programming",
      operation: selectedOperation.label,
      machine: machineModel,
      note: "Stage prove-out, safe-start confirmation, and actual-vs-expected runtime feedback for this post.",
      origin: effectiveOrigin,
      focus: postFocus
    }),
    [
      effectiveOrigin,
      location.pathname,
      location.search,
      machineModel,
      postFocus,
      programName,
      selectedOperation.label
    ]
  );
  const handleFingerprintChange = (0, import_react11.useCallback)(
    (result) => {
      setFingerprint(result);
      if (!result) return;
      if (controllers.some((c) => c.value === result.controller_family)) {
        setController(result.controller_family);
      }
      const postureMap = {
        "3-axis": "3_axis_vmc",
        "3_axis": "3_axis_vmc",
        "5-axis": "5_axis_trunnion",
        "5_axis": "5_axis_trunnion",
        turning: "lathe",
        lathe: "lathe",
        "mill-turn": "mill_turn",
        mill_turn: "mill_turn",
        swiss: "swiss",
        horizontal: "horizontal"
      };
      const mapped = postureMap[result.axis_config.toLowerCase()];
      if (mapped) setMachinePosture(mapped);
      if (result.matched_profile) {
        setMachineModel(
          `${result.matched_profile.brand} ${result.matched_profile.model}`
        );
      }
      const ids = [];
      const rf = result.recommended_features;
      if (rf.probing) ids.push("probing");
      if (rf.tsc) ids.push("tsc");
      if (rf.hsm) ids.push("hsm");
      if (rf.tcp) ids.push("tcp");
      if (rf.ssv) ids.push("ssv");
      if (rf.subprograms) ids.push("subprograms");
      if (rf.chip_conveyor) ids.push("chip_conveyor");
      setEnabledFeatures(new Set(ids));
      const capIds = [];
      if (rf.probing) capIds.push("probing_cycles");
      if (rf.hsm) capIds.push("high_speed_smoothing");
      if (rf.tcp) capIds.push("rtcp");
      if (rf.subprograms) capIds.push("subprograms");
      if (capIds.length > 0) {
        setSelectedCapabilityIds((current) => uniqueStrings([...current, ...capIds]));
      }
    },
    [controllers]
  );
  const handleFeatureToggle = (0, import_react11.useCallback)(
    (featureId, enabled) => {
      setEnabledFeatures((prev) => {
        const next = new Set(prev);
        if (enabled) next.add(featureId);
        else next.delete(featureId);
        return next;
      });
      const featureToCapability = {
        probing: "probing_cycles",
        hsm: "high_speed_smoothing",
        tcp: "rtcp",
        subprograms: "subprograms"
      };
      const capId = featureToCapability[featureId];
      if (capId) {
        setSelectedCapabilityIds(
          (current) => enabled ? uniqueStrings([...current, capId]) : current.filter((id) => id !== capId)
        );
      }
    },
    []
  );
  const handleControllerOverride = (0, import_react11.useCallback)(
    (overrideValue) => {
      setControllerOverride(overrideValue);
      if (overrideValue) {
        if (controllers.some((c) => c.value === overrideValue)) {
          setController(overrideValue);
        }
      } else if (fingerprint) {
        const autoValue = fingerprint.controller_family;
        if (controllers.some((c) => c.value === autoValue)) {
          setController(autoValue);
        }
      }
    },
    [controllers, fingerprint]
  );
  function toggleCapability(id) {
    setSelectedCapabilityIds(
      (current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }
  function loadRecommendedStack() {
    setSelectedCapabilityIds(
      (current) => uniqueStrings([...current, ...requiredCapabilityIds, ...recommendedCapabilityIds])
    );
  }
  function selectFullMachineStack() {
    setSelectedCapabilityIds(
      (current) => uniqueStrings([...current, ...visibleCapabilities.map((item) => item.id)])
    );
  }
  async function handleGenerate() {
    setLoadingAction(true);
    setError(null);
    setLane("generate");
    try {
      const hasMaterial = selectedMaterialId && selectedMaterialKc > 0;
      const hasTool = parseFloat(toolDiameter) > 0;
      const isDefaultProgram = gcodeInput.trim() === DEFAULT_PROGRAM.trim();
      const hasGcode = gcodeInput.trim().length > 10;
      if (hasGcode) {
        const pipelineInput = {
          gcode: gcodeInput,
          controller: selectedController.value || "fanuc",
          stages: buildStageConfig(),
          include_analytics: true,
          aggressiveness: 0.5,
          optimization_target: "balanced",
          output_mode: outputMode
        };
        if (hasMaterial) {
          pipelineInput.material = {
            name: selectedMaterialName,
            iso_group: selectedMaterialIso,
            kc1_1: selectedMaterialKc,
            mc: selectedMaterialMc
          };
        }
        if (hasTool) {
          pipelineInput.tools = [{
            tool_number: 1,
            diameter_mm: parseFloat(toolDiameter),
            flute_count: parseInt(toolFlutes, 10) || 4,
            type: toolType,
            material: toolMaterial
          }];
        }
        if (machineModel) {
          pipelineInput.machine = { name: machineModel };
        }
        try {
          const pipeRes = await ppgPipelineProcess(pipelineInput);
          const pipeData = unwrapPayload(pipeRes);
          if (pipeData?.output_gcode || pipeData?.stages) {
            setPipelineResult(pipeData);
            setPipelineStages(pipeData?.stages ?? []);
            setOriginalGcode(gcodeInput);
            const outputGcode = String(pipeData.output_gcode || gcodeInput);
            const stageArr = pipeData.stages ?? [];
            const stageCount = stageArr.filter((s) => s.status === "pass").length;
            const nextGenerated2 = {
              post_name: programName || "PRISM_OPTIMIZED",
              controller: selectedController.label,
              cam_system: selectedCam.label,
              operation: selectedOperation.label,
              machine_model: machineModel,
              estimated_lines: outputGcode.split("\n").filter(Boolean).length,
              optimization_package: `PRISM Physics Pipeline (${stageCount} stages)`,
              capabilities: [
                ...selectedCapabilityDetails.map((item) => item.label),
                ...hasMaterial ? [`Auto S/F: ${selectedMaterialName}`] : [],
                ...stageCount > 0 ? [`${stageCount} physics stages active`] : []
              ],
              preview: outputGcode
            };
            setGenerated(nextGenerated2);
            if (outputGcode !== gcodeInput) {
              setShowDiff(true);
            }
            setLoadingAction(false);
            return;
          }
        } catch {
        }
      }
      const response = strategy === "multi_operation" ? await ppgProgram({
        cam_system: camSystem,
        controller: selectedController.label,
        machine_type: selectedMachinePosture.label,
        machine_model: machineModel,
        operation,
        program_name: programName,
        notes
      }) : await ppgGenerate({
        cam_system: camSystem,
        controller: selectedController.label,
        machine_type: selectedMachinePosture.label,
        machine_model: machineModel,
        operation,
        program_name: programName,
        notes
      });
      const payload = unwrapPayload(response);
      const fallback = buildLocalGeneratedOutput({
        programName,
        controllerLabel: selectedController.label,
        camLabel: selectedCam.label,
        operationLabel: selectedOperation.label,
        machineModel,
        machinePostureLabel: selectedMachinePosture.label,
        selectedCapabilityLabels: selectedCapabilityDetails.map((item) => item.label)
      });
      const preview = String(payload?.gcode ?? payload?.program ?? payload?.preview ?? "");
      const capabilities = Array.isArray(payload?.capabilities) ? payload?.capabilities : fallback.capabilities;
      const nextGenerated = {
        post_name: String(payload?.post_name ?? payload?.name ?? programName),
        controller: String(payload?.controller ?? selectedController.label),
        cam_system: String(payload?.cam_system ?? selectedCam.label),
        operation: String(payload?.operation ?? selectedOperation.label),
        machine_model: String(payload?.machine_model ?? machineModel),
        estimated_lines: Number(
          payload?.program_line_count ?? (preview.split("\n").filter(Boolean).length || fallback.estimated_lines)
        ),
        optimization_package: String(
          payload?.optimization_package ?? fallback.optimization_package
        ),
        capabilities: uniqueStrings([
          ...capabilities,
          ...selectedCapabilityDetails.map((item) => item.label)
        ]),
        preview: preview || fallback.preview
      };
      setGenerated(nextGenerated);
      setGcodeInput(nextGenerated.preview);
    } catch (issue) {
      if (issue instanceof ApiError) {
        setError(`${issue.message} Falling back to a local post brief.`);
      } else {
        setError("Unable to reach the post generator right now. Showing a local packet.");
      }
      const fallback = buildLocalGeneratedOutput({
        programName,
        controllerLabel: selectedController.label,
        camLabel: selectedCam.label,
        operationLabel: selectedOperation.label,
        machineModel,
        machinePostureLabel: selectedMachinePosture.label,
        selectedCapabilityLabels: selectedCapabilityDetails.map((item) => item.label)
      });
      setGenerated(fallback);
    } finally {
      setLoadingAction(false);
    }
  }
  async function handleValidate() {
    setLoadingAction(true);
    setError(null);
    setLane("validate");
    const provisionalChecks = buildReleaseChecks({
      machinePosture,
      machinePostureLabel: selectedMachinePosture.label,
      selectedCapabilityIds,
      missingRequired,
      missingRecommended,
      generated,
      validation: null,
      comparison
    });
    try {
      const response = await ppgValidate({
        controller: selectedController.label,
        gcode: gcodeInput
      });
      const payload = unwrapPayload(response);
      const warnings = uniqueStrings([
        ...Array.isArray(payload?.warnings) ? payload.warnings : [],
        ...provisionalChecks.filter((check) => check.status !== "ready").map((check) => check.detail)
      ]);
      const passes = uniqueStrings([
        ...Array.isArray(payload?.passes) ? payload.passes : [],
        ...provisionalChecks.filter((check) => check.status === "ready").map((check) => check.label)
      ]);
      const fallback = buildLocalValidationOutput(
        selectedController.label,
        gcodeInput,
        provisionalChecks
      );
      setValidation({
        status: String(payload?.status ?? fallback.status),
        score: Number(payload?.score ?? payload?.confidence ?? fallback.score),
        warnings,
        passes,
        controller: selectedController.label
      });
    } catch (issue) {
      if (issue instanceof ApiError) {
        setError(`${issue.message} Showing a local readiness review instead.`);
      } else {
        setError("Unable to validate live right now. Showing a local readiness review instead.");
      }
      setValidation(
        buildLocalValidationOutput(
          selectedController.label,
          gcodeInput,
          provisionalChecks
        )
      );
    } finally {
      setLoadingAction(false);
    }
  }
  async function handleCompare() {
    setLoadingAction(true);
    setError(null);
    setLane("compare");
    try {
      const response = await ppgCompare({
        gcode: gcodeInput,
        controllers: [selectedController.label, selectedCompareTarget.label]
      });
      const payload = unwrapPayload(response);
      const fallback = buildLocalComparisonOutput(
        selectedController.label,
        selectedCompareTarget.label,
        machinePosture
      );
      setComparison({
        baseline: selectedController.label,
        target: selectedCompareTarget.label,
        delta_summary: Array.isArray(payload?.differences) ? uniqueStrings(payload.differences) : Array.isArray(payload?.delta_summary) ? uniqueStrings(payload.delta_summary) : fallback.delta_summary,
        baseline_notes: Array.isArray(payload?.baseline_notes) ? uniqueStrings(payload.baseline_notes) : fallback.baseline_notes,
        target_notes: Array.isArray(payload?.target_notes) ? uniqueStrings(payload.target_notes) : fallback.target_notes,
        baseline_gcode: typeof payload?.baseline_gcode === "string" ? payload.baseline_gcode : typeof payload?.baseline_output === "string" ? payload.baseline_output : gcodeInput || void 0,
        target_gcode: typeof payload?.target_gcode === "string" ? payload.target_gcode : typeof payload?.target_output === "string" ? payload.target_output : void 0
      });
    } catch (issue) {
      if (issue instanceof ApiError) {
        setError(`${issue.message} Showing a local controller-delta brief instead.`);
      } else {
        setError("Unable to compare live right now. Showing a local delta brief instead.");
      }
      setComparison(
        buildLocalComparisonOutput(
          selectedController.label,
          selectedCompareTarget.label,
          machinePosture
        )
      );
    } finally {
      setLoadingAction(false);
    }
  }
  const autoDetectController = (0, import_react11.useCallback)((gcode) => {
    const lines = gcode.split("\n").slice(0, 20).join("\n");
    if (/BEGIN PGM|BLK FORM|CYCL DEF|TCH PROBE/i.test(lines)) {
      setDetectedController("heidenhain_tnc640");
      setDetectedConfidence("high");
      const match = controllers.find((c) => c.value.startsWith("heidenhain"));
      if (match) setController(match.value);
      return;
    }
    if (/;\$PATH=|CYCLE800|CYCLE\d{3}|DEF\s+INT|PROC\s/i.test(lines)) {
      setDetectedController("siemens_840d");
      setDetectedConfidence("high");
      const match = controllers.find((c) => c.value.startsWith("siemens"));
      if (match) setController(match.value);
      return;
    }
    if (/^O0{3,}\d/m.test(lines) || /G65\s*P\d{4}/.test(lines)) {
      setDetectedController("haas");
      setDetectedConfidence("high");
      const match = controllers.find((c) => c.value.startsWith("haas"));
      if (match) setController(match.value);
      return;
    }
    if (/MAZATROL|G10\s*L2/i.test(lines)) {
      setDetectedController("mazak");
      setDetectedConfidence("medium");
      const match = controllers.find((c) => c.value.startsWith("mazak"));
      if (match) setController(match.value);
      return;
    }
    if (/^[%O]\d/m.test(lines) || /\(.*\)/.test(lines) || /M98\s*P/i.test(lines)) {
      setDetectedController("fanuc");
      setDetectedConfidence("medium");
      const match = controllers.find((c) => c.value.startsWith("fanuc"));
      if (match) setController(match.value);
      return;
    }
    setDetectedController(null);
    setDetectedConfidence("");
  }, [controllers, setController]);
  const handleFileUpload = (0, import_react11.useCallback)((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      setGcodeInput(text);
      setOriginalGcode(text);
      setFileName(file.name);
      setFileSize(file.size);
      autoDetectController(text);
    };
    reader.readAsText(file);
  }, [autoDetectController]);
  const handleFileInputChange = (0, import_react11.useCallback)((e) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);
  const handleDragOver = (0, import_react11.useCallback)((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);
  const handleDragLeave = (0, import_react11.useCallback)(() => {
    setIsDragOver(false);
  }, []);
  const handleDrop = (0, import_react11.useCallback)((e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);
  const handleDownload = (0, import_react11.useCallback)(() => {
    const output = generated?.preview ?? "";
    if (!output) return;
    const baseName = fileName ? fileName.replace(/\.[^.]+$/, "") : "program";
    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${baseName}_PRISM_optimized.nc`;
    a.click();
    URL.revokeObjectURL(url);
  }, [generated, fileName]);
  const handleCopyToClipboard = (0, import_react11.useCallback)(async () => {
    const output = generated?.preview ?? "";
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2e3);
    } catch {
    }
  }, [generated]);
  const loadHistory = (0, import_react11.useCallback)(async () => {
    setHistoryLoading(true);
    try {
      const res = await ppgHistory();
      const payload = unwrapPayload(res);
      if (payload) {
        const items = payload.history ?? payload.runs ?? payload.items ?? [];
        if (Array.isArray(items)) {
          setHistory(items);
        }
      }
    } catch {
    }
    setHistoryLoading(false);
  }, []);
  const handleMaterialSearch = (0, import_react11.useCallback)(async (query) => {
    setMaterialSearchQuery(query);
    if (query.length < 2) {
      setMaterialSearchResults([]);
      return;
    }
    try {
      const res = await ppgMaterialSearch(query);
      const payload = unwrapPayload(res);
      const mats = payload?.materials ?? [];
      setMaterialSearchResults(mats);
    } catch {
      const common = [
        { id: "steel", name: "Carbon Steel (C35-C45)", iso_group: "P", kc1_1: 1800, mc: 0.25, hardness_HB: 180 },
        { id: "alloy_steel", name: "Alloy Steel (4140/4340)", iso_group: "P", kc1_1: 2100, mc: 0.25, hardness_HB: 280 },
        { id: "stainless_304", name: "Stainless Steel 304", iso_group: "M", kc1_1: 2100, mc: 0.25, hardness_HB: 200 },
        { id: "aluminum_6061", name: "Aluminum 6061-T6", iso_group: "N", kc1_1: 700, mc: 0.23, hardness_HB: 95 },
        { id: "titanium", name: "Titanium Ti-6Al-4V", iso_group: "S", kc1_1: 2800, mc: 0.28, hardness_HB: 334 },
        { id: "tool_steel", name: "Tool Steel (D2/H13)", iso_group: "H", kc1_1: 3e3, mc: 0.28, hardness_HB: 500 },
        { id: "cast_iron", name: "Gray Cast Iron (GG25)", iso_group: "K", kc1_1: 1100, mc: 0.28, hardness_HB: 210 },
        { id: "inconel_718", name: "Inconel 718", iso_group: "S", kc1_1: 2800, mc: 0.28, hardness_HB: 350 },
        { id: "brass", name: "Brass (CuZn39Pb3)", iso_group: "N", kc1_1: 700, mc: 0.23, hardness_HB: 120 }
      ];
      const q = query.toLowerCase();
      setMaterialSearchResults(common.filter((m) => m.name.toLowerCase().includes(q) || m.id.includes(q)));
    }
  }, []);
  const selectMaterial = (0, import_react11.useCallback)((mat) => {
    setSelectedMaterialId(mat.id);
    setSelectedMaterialName(mat.name);
    setSelectedMaterialIso(mat.iso_group);
    setSelectedMaterialKc(mat.kc1_1);
    setSelectedMaterialMc(mat.mc);
    setMaterialSearchResults([]);
    setMaterialSearchQuery(mat.name);
  }, []);
  const buildStageConfig = (0, import_react11.useCallback)(() => {
    const stages = {};
    const caps = new Set(selectedCapabilityIds);
    stages.speed_feed = true;
    stages.engagement_analysis = true;
    stages.chip_thinning = true;
    stages.adaptive_feed = true;
    stages.corner_detection = true;
    stages.wear_progression = true;
    stages.thermal_tracking = true;
    stages.coupled_thermal_wear = true;
    stages.safety_analysis = true;
    stages.gcode_generation = true;
    stages.analytics_report = true;
    stages.cycle_time = true;
    if (caps.has("probing_cycles")) stages.probe_routines = true;
    if (caps.has("high_speed_smoothing")) {
      stages.toolpath_smoothing = true;
      stages.motion_dynamics = true;
      stages.look_ahead = true;
    }
    if (caps.has("rtcp")) stages.multi_axis = true;
    if (caps.has("ssv")) stages.stability_rewrite = true;
    if (caps.has("subprograms") || caps.has("chip_conveyor")) stages.controller_features = true;
    return stages;
  }, [selectedCapabilityIds]);
  const wizardStepComplete = (0, import_react11.useMemo)(() => ({
    1: !!controller && !!machinePosture,
    2: !!selectedMaterialId,
    3: !!toolDiameter && parseFloat(toolDiameter) > 0,
    4: !!camSystem,
    5: false
    // generate is the action step
  }), [controller, machinePosture, selectedMaterialId, toolDiameter, camSystem]);
  const canAdvanceWizard = wizardStepComplete[wizardStep];
  (0, import_react11.useEffect)(() => {
    const d = parseFloat(toolDiameter);
    if (!selectedMaterialId || !d || d <= 0 || pageMode !== "wizard") {
      setSfPreview(null);
      return;
    }
    const ac = new AbortController();
    const timer = setTimeout(async () => {
      setSfPreviewLoading(true);
      try {
        const res = await calculateSpeedFeed({
          material: selectedMaterialName || selectedMaterialId,
          operation,
          tool_diameter_mm: d,
          doc_mm: d * 0.5
        });
        if (ac.signal.aborted) return;
        const r = res.result;
        if (r) {
          const speed = r.speed;
          const feed = r.feed;
          const force = r.force;
          const power = r.power;
          const rpm = Number(speed?.rpm ?? speed?.RPM ?? 0);
          const feedRate = Number(feed?.feed_rate_mmmin ?? feed?.vf ?? feed?.feed_mmmin ?? 0);
          const sfm = Number(speed?.sfm ?? speed?.SFM ?? (d > 0 ? rpm * Math.PI * d / 1e3 * 3.281 : 0));
          const fz = Number(feed?.fz ?? feed?.ipt ?? 0);
          const fc = Number(force?.Fc ?? force?.cutting_force_N ?? 0);
          const pw = Number(power?.kW ?? power?.power_kW ?? 0);
          const tirFactor = selectedHolder ? Math.max(0.85, Math.min(1, 1 - selectedHolder.tir_um / 1e3 * 100)) : 1;
          setSfPreview({
            rpm: Math.round(rpm * tirFactor),
            feed_mmmin: feedRate * tirFactor,
            sfm: sfm * tirFactor,
            ipt: fz,
            force_N: fc,
            power_kW: pw
          });
        }
      } catch {
        if (!ac.signal.aborted) setSfPreview(null);
      } finally {
        if (!ac.signal.aborted) setSfPreviewLoading(false);
      }
    }, 500);
    return () => {
      ac.abort();
      clearTimeout(timer);
    };
  }, [selectedMaterialId, selectedMaterialName, toolDiameter, operation, selectedHolder, pageMode]);
  return /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "space-y-6", children: [
    /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("nav", { className: "flex items-center gap-2 text-sm text-slate-400", "aria-label": "Breadcrumb", children: [
      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(Link, { to: "/post-processor", className: "hover:text-cyan-400 transition", children: "Post Processor" }),
      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { "aria-hidden": "true", children: "/" }),
      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { className: "text-slate-200", children: "Generator" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
      WorkspaceHero,
      {
        eyebrow: "Post workflow",
        title: "Post Processor Generator",
        description: pageMode === "wizard" ? "Follow the guided steps to configure your machine, material, tooling, and CAM system \u2014 then generate an optimized post processor." : "Stage machine options, controller behavior, prove-out posture, and downstream packet continuity instead of stopping at raw NC text.",
        metrics: /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(import_jsx_runtime13.Fragment, { children: pageMode === "wizard" ? /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(import_jsx_runtime13.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
            SummaryTile,
            {
              label: "Machine",
              value: machineModel || selectedMachinePosture.label,
              hint: wizardStepComplete[1] ? selectedController.label : "Configure in step 1",
              accent: wizardStepComplete[1] ? "from-emerald-400/20 via-emerald-300/10 to-transparent" : "from-cyan-400/22 via-cyan-300/10 to-transparent"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
            SummaryTile,
            {
              label: "Material",
              value: selectedMaterialName || "Not selected",
              hint: selectedMaterialIso ? `ISO ${selectedMaterialIso} \xB7 kc1.1=${selectedMaterialKc}` : "Configure in step 2",
              accent: wizardStepComplete[2] ? "from-emerald-400/20 via-emerald-300/10 to-transparent" : "from-slate-400/10 via-slate-300/5 to-transparent"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
            SummaryTile,
            {
              label: "Progress",
              value: `Step ${wizardStep} of 5`,
              hint: WIZARD_STEPS[wizardStep - 1].label + " \u2014 " + WIZARD_STEPS[wizardStep - 1].hint,
              accent: "from-violet-400/22 via-violet-300/10 to-transparent"
            }
          )
        ] }) : /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(import_jsx_runtime13.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
            SummaryTile,
            {
              label: "Active lane",
              value: activeLane.label,
              hint: activeLane.detail,
              accent: "from-cyan-400/22 via-cyan-300/10 to-transparent"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
            SummaryTile,
            {
              label: "Controller posture",
              value: selectedController.label,
              hint: `${selectedMachinePosture.label} \xB7 ${selectedOperation.label}`,
              accent: "from-emerald-400/20 via-emerald-300/10 to-transparent"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
            SummaryTile,
            {
              label: "Release posture",
              value: readinessSummary,
              hint: `${selectedCapabilityIds.length} capability gates selected`,
              accent: "from-violet-400/22 via-violet-300/10 to-transparent"
            }
          )
        ] }) }),
        aside: /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "space-y-4", children: [
          /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "space-y-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "text-xs font-semibold uppercase tracking-[0.2em] text-slate-400", children: "Workflow lanes" }),
            /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "flex flex-wrap gap-2", children: Object.entries(LANE_CONFIG).map(([key, config]) => /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
              TabButton,
              {
                active: lane === key,
                onClick: () => setLane(key),
                children: config.label
              },
              key
            )) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "flex flex-wrap gap-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(StatusPill, { label: selectedCam.label, tone: "sky" }),
            /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(StatusPill, { label: selectedMachinePosture.label, tone: "violet" }),
            /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(StatusPill, { label: selectedOperation.label, tone: "emerald" }),
            /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(StatusPill, { label: recommendedTier, tone: "amber" })
          ] }),
          (sourceContextLabel || upstreamSourceLabel || upstreamRecordLabel) && /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "rounded-[22px] border border-cyan-300/12 bg-cyan-300/[0.05] p-4 text-sm text-slate-200", children: [
            /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/90", children: "Packet source" }),
            sourceContextLabel ? /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "mt-2", children: [
              "Opened from ",
              /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { className: "font-semibold", children: sourceContextLabel }),
              "."
            ] }) : null,
            upstreamSourceLabel ? /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "mt-1 text-slate-300", children: [
              "Commercial origin remains",
              " ",
              /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { className: "font-semibold", children: upstreamSourceLabel }),
              "."
            ] }) : null,
            upstreamRecordLabel ? /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "mt-1 text-slate-400", children: upstreamRecordLabel }) : null
          ] }),
          loadingCatalog ? /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "rounded-[22px] border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300", children: "Loading controller and operation catalogs. Local coverage stays available while the live catalog hydrates." }) : null
        ] })
      }
    ),
    workspaceContext ? /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
      MachineWorkspaceAuthorityCard,
      {
        context: workspaceContext,
        title: "Shared routed post authority",
        subtitle: `This post desk now inherits the same JM Die machine, controller, material, and programming posture from ${routedSourceLabel}.`
      }
    ) : null,
    workspaceContext ? /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "rounded-[22px] border border-sky-300/14 bg-sky-300/[0.06] px-4 py-4 text-sm leading-6 text-slate-200", children: [
      "JM Die routed defaults are active in this post packet desk. You can still adjust machine posture, controller, and material before generation.",
      controllerWasMapped ? ` PRISM mapped ${routedControllerLabel} onto the current controller catalog as ${routedControllerValue}.` : ""
    ] }) : null,
    error ? /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "rounded-[24px] border border-amber-300/14 bg-amber-300/[0.08] px-5 py-4 text-sm text-amber-100", children: error }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "flex items-center gap-3", children: [
      /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "flex rounded-full border border-white/10 bg-white/[0.03] p-1", children: [
        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
          "button",
          {
            className: `rounded-full px-4 py-1.5 text-xs font-semibold transition ${pageMode === "wizard" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/30" : "text-slate-400 hover:text-slate-200"}`,
            onClick: () => setPageMode("wizard"),
            children: "Guided wizard"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
          "button",
          {
            className: `rounded-full px-4 py-1.5 text-xs font-semibold transition ${pageMode === "lanes" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/30" : "text-slate-400 hover:text-slate-200"}`,
            onClick: () => setPageMode("lanes"),
            children: "Advanced lanes"
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { className: "text-xs text-slate-500", children: pageMode === "wizard" ? "Step-by-step guided post generation" : "6-lane power user workflow" })
    ] }),
    pageMode === "wizard" && /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "space-y-6", children: [
      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "flex items-center gap-1", children: WIZARD_STEPS.map((s, idx) => /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "flex items-center", children: [
        /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(
          "button",
          {
            onClick: () => {
              if (s.step <= wizardStep || s.step === wizardStep + 1 && canAdvanceWizard) {
                setWizardStep(s.step);
              }
            },
            className: `flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${s.step === wizardStep ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/30" : s.step < wizardStep || wizardStepComplete[s.step] ? "bg-emerald-500/10 text-emerald-400 border border-emerald-400/20" : "text-slate-500 border border-white/6 bg-white/[0.02]"}`,
            disabled: s.step > wizardStep + 1,
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { className: "flex h-6 w-6 items-center justify-center rounded-full bg-black/30 text-xs", children: wizardStepComplete[s.step] && s.step < wizardStep ? "\u2713" : s.step }),
              /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { className: "hidden sm:inline", children: s.label })
            ]
          }
        ),
        idx < WIZARD_STEPS.length - 1 && /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: `mx-1 h-px w-6 ${s.step < wizardStep ? "bg-emerald-400/40" : "bg-white/10"}` })
      ] }, s.step)) }),
      /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(
        PanelCard,
        {
          title: `Step ${wizardStep}: ${WIZARD_STEPS[wizardStep - 1].label}`,
          subtitle: WIZARD_STEPS[wizardStep - 1].hint,
          children: [
            wizardStep === 1 && /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "space-y-6", children: [
              /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                MachinePickerPanel,
                {
                  onFingerprintChange: (fp) => {
                    setFingerprint(fp);
                    if (fp?.matched_profile) {
                      setMachineModel(`${fp.matched_profile.brand} ${fp.matched_profile.model}`);
                      const ctrlFamily = fp.controller_family?.toLowerCase().replace(/\s+/g, "_");
                      if (ctrlFamily) {
                        const match = controllers.find((c) => c.value.includes(ctrlFamily));
                        if (match) setController(match.value);
                      }
                    }
                  },
                  onManufacturerChange: () => {
                  },
                  onModelChange: (m) => {
                    if (m) setMachineModel(m);
                  }
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                FeatureTogglePanel,
                {
                  fingerprint,
                  enabledFeatures,
                  onToggle: (fid, on) => {
                    setEnabledFeatures((prev) => {
                      const next = new Set(prev);
                      if (on) next.add(fid);
                      else next.delete(fid);
                      return next;
                    });
                  }
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "grid gap-4 md:grid-cols-2", children: [
                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(Field, { label: "Machine posture", children: /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                  Select,
                  {
                    "aria-label": "Machine posture",
                    value: machinePosture,
                    onChange: (e) => setMachinePosture(e.target.value),
                    children: MACHINE_POSTURES.map((item) => /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("option", { value: item.value, children: item.label }, item.value))
                  }
                ) }),
                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(Field, { label: "Controller", children: /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                  Select,
                  {
                    "aria-label": "Controller",
                    value: controller,
                    onChange: (e) => setController(e.target.value),
                    children: controllers.map((item) => /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("option", { value: item.value, children: item.label }, item.value))
                  }
                ) })
              ] })
            ] }),
            wizardStep === 2 && /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
              MaterialSearchPanel,
              {
                selected: selectedMaterialId ? {
                  id: selectedMaterialId,
                  name: selectedMaterialName,
                  iso_group: selectedMaterialIso,
                  kc1_1: selectedMaterialKc,
                  mc: selectedMaterialMc
                } : null,
                onSelect: (mat) => {
                  setSelectedMaterialId(mat.id);
                  setSelectedMaterialName(mat.name);
                  setSelectedMaterialIso(mat.iso_group);
                  setSelectedMaterialKc(mat.kc1_1);
                  setSelectedMaterialMc(mat.mc);
                }
              }
            ),
            wizardStep === 3 && /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "space-y-6", children: [
              /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                ToolConfigCard,
                {
                  diameter: toolDiameter,
                  flutes: toolFlutes,
                  toolType,
                  toolMaterial,
                  onDiameterChange: setToolDiameter,
                  onFlutesChange: setToolFlutes,
                  onToolTypeChange: setToolType,
                  onToolMaterialChange: setToolMaterial,
                  selectedTool,
                  onSelectTool: setSelectedTool
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "border-t border-white/6 pt-6", children: [
                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "mb-3 text-sm font-semibold text-slate-300", children: "Tool holder" }),
                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                  HolderSelectorPanel,
                  {
                    selected: selectedHolder,
                    onSelect: setSelectedHolder
                  }
                )
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "grid gap-3 border-t border-white/6 pt-6 sm:grid-cols-2", children: [
                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(Field, { label: "Operation", children: /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                  Select,
                  {
                    "aria-label": "Operation",
                    value: operation,
                    onChange: (e) => setOperation(e.target.value),
                    children: operations.map((item) => /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("option", { value: item.value, children: item.label }, item.value))
                  }
                ) }),
                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(Field, { label: "Program style", children: /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(
                  Select,
                  {
                    "aria-label": "Strategy",
                    value: strategy,
                    onChange: (e) => setStrategy(e.target.value),
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("option", { value: "ai_enhanced", children: "AI-enhanced release" }),
                      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("option", { value: "production_safe", children: "Production safe" }),
                      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("option", { value: "prove_out", children: "Operator prove-out" }),
                      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("option", { value: "multi_operation", children: "Multi-operation packet" })
                    ]
                  }
                ) })
              ] }),
              selectedMaterialId && parseFloat(toolDiameter) > 0 && /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "rounded-[16px] border border-amber-400/15 bg-amber-400/[0.04] px-4 py-3", children: [
                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "mb-2 text-xs font-semibold uppercase tracking-wider text-amber-300/80", children: "Speed & feed preview" }),
                sfPreviewLoading ? /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "text-sm text-slate-400", children: "Calculating..." }) : sfPreview ? /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "grid gap-3 sm:grid-cols-3", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { children: [
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "text-lg font-bold text-amber-200", children: sfPreview.rpm.toLocaleString() }),
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "text-[10px] uppercase tracking-wider text-slate-500", children: "RPM" })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { children: [
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "text-lg font-bold text-amber-200", children: sfPreview.feed_mmmin.toFixed(0) }),
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "text-[10px] uppercase tracking-wider text-slate-500", children: "mm/min feed" })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { children: [
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "text-lg font-bold text-amber-200", children: sfPreview.sfm.toFixed(0) }),
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "text-[10px] uppercase tracking-wider text-slate-500", children: "SFM" })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { children: [
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "text-sm font-semibold text-slate-300", children: sfPreview.ipt.toFixed(4) }),
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "text-[10px] uppercase tracking-wider text-slate-500", children: "IPT" })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { children: [
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "text-sm font-semibold text-slate-300", children: [
                      sfPreview.force_N.toFixed(0),
                      " N"
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "text-[10px] uppercase tracking-wider text-slate-500", children: "Cutting force" })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { children: [
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "text-sm font-semibold text-slate-300", children: [
                      sfPreview.power_kW.toFixed(2),
                      " kW"
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "text-[10px] uppercase tracking-wider text-slate-500", children: "Power" })
                  ] })
                ] }) : /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "text-sm text-slate-500", children: "Select a material and configure tool to see live speed/feed preview" }),
                selectedHolder && sfPreview && /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "mt-2 flex flex-wrap gap-2", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(StatusPill, { label: `TIR ${selectedHolder.tir_um}\xB5m`, tone: selectedHolder.tir_um <= 3 ? "emerald" : selectedHolder.tir_um <= 8 ? "amber" : "rose" }),
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(StatusPill, { label: `Holder: ${selectedHolder.name}`, tone: "violet" })
                ] })
              ] })
            ] }),
            wizardStep === 4 && /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "space-y-6", children: [
              /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "mb-3 text-sm font-semibold text-slate-300", children: "Select CAM software" }),
                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "grid gap-2 sm:grid-cols-3 lg:grid-cols-4", children: CAM_PACKAGES.map((pkg) => /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(
                  "button",
                  {
                    onClick: () => setCamSystem(pkg.value),
                    className: `rounded-[14px] border px-4 py-3 text-left transition ${camSystem === pkg.value ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-200" : "border-white/6 bg-white/[0.02] text-slate-300 hover:bg-white/[0.05]"}`,
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "text-sm font-semibold", children: pkg.label }),
                      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "mt-1 text-[11px] leading-tight text-slate-500", children: pkg.detail })
                    ]
                  },
                  pkg.value
                )) })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(Field, { label: "Program name", children: /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                Input,
                {
                  "aria-label": "Program name",
                  value: programName,
                  onChange: (e) => setProgramName(e.target.value),
                  placeholder: "e.g. PRISM_VF2_PRODUCTION"
                }
              ) }),
              /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(Field, { label: "G-code input (paste or upload)", children: /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                "textarea",
                {
                  className: "min-h-[200px] w-full resize-y rounded-[12px] border border-white/10 bg-black/30 px-4 py-3 font-mono text-sm text-slate-200 focus:border-cyan-400/40 focus:outline-none",
                  value: gcodeInput,
                  onChange: (e) => setGcodeInput(e.target.value),
                  placeholder: "Paste your G-code here, or upload an NC file..."
                }
              ) })
            ] }),
            wizardStep === 5 && /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "space-y-4", children: [
              /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-4", children: [
                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                  SummaryTile,
                  {
                    label: "Machine",
                    value: machineModel || selectedMachinePosture.label,
                    hint: selectedController.label,
                    accent: "from-cyan-400/22 via-cyan-300/10 to-transparent"
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                  SummaryTile,
                  {
                    label: "Material",
                    value: selectedMaterialName || "Not set",
                    hint: selectedMaterialIso ? `ISO ${selectedMaterialIso} \xB7 kc1.1=${selectedMaterialKc}` : "Select in step 2",
                    accent: "from-emerald-400/20 via-emerald-300/10 to-transparent"
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                  SummaryTile,
                  {
                    label: "Tool",
                    value: selectedTool ? selectedTool.name : toolDiameter ? `\xD8${toolDiameter}mm ${toolFlutes}F` : "Not set",
                    hint: selectedHolder ? `${selectedHolder.name} \xB7 TIR ${selectedHolder.tir_um}\xB5m` : selectedOperation.label,
                    accent: "from-violet-400/22 via-violet-300/10 to-transparent"
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                  SummaryTile,
                  {
                    label: "CAM",
                    value: selectedCam.label,
                    hint: `${gcodeInput.split("\n").length} lines`,
                    accent: "from-amber-400/22 via-amber-300/10 to-transparent"
                  }
                )
              ] }),
              sfPreview && /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "rounded-[16px] border border-amber-400/12 bg-amber-400/[0.04] px-4 py-3", children: [
                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "mb-2 text-xs font-semibold uppercase tracking-wider text-amber-300/80", children: "Optimized parameters" }),
                /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "flex flex-wrap gap-4 text-sm", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("span", { className: "text-amber-200 font-semibold", children: [
                    sfPreview.rpm.toLocaleString(),
                    " RPM"
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("span", { className: "text-amber-200 font-semibold", children: [
                    sfPreview.feed_mmmin.toFixed(0),
                    " mm/min"
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("span", { className: "text-slate-400", children: [
                    sfPreview.sfm.toFixed(0),
                    " SFM"
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("span", { className: "text-slate-400", children: [
                    sfPreview.force_N.toFixed(0),
                    " N"
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("span", { className: "text-slate-400", children: [
                    sfPreview.power_kW.toFixed(2),
                    " kW"
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                ActionButton,
                {
                  onClick: handleGenerate,
                  disabled: loadingAction,
                  children: loadingAction ? "Generating..." : "Generate optimized post"
                }
              ),
              generated && /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "space-y-4", children: [
                /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "rounded-[16px] border border-emerald-400/15 bg-emerald-400/[0.06] p-4", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "flex flex-wrap items-center gap-2", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("span", { className: "text-sm font-semibold text-emerald-300", children: [
                      "Post generated: ",
                      generated.post_name
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(StatusPill, { label: `${generated.estimated_lines} lines`, tone: "emerald" }),
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(StatusPill, { label: generated.controller, tone: "sky" }),
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(StatusPill, { label: generated.cam_system, tone: "violet" })
                  ] }),
                  generated.capabilities?.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "mt-2 flex flex-wrap gap-1", children: generated.capabilities.map((cap) => /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(StatusPill, { label: cap, tone: "slate" }, cap)) })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "flex flex-wrap items-center gap-3", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("label", { className: "flex cursor-pointer items-center gap-2 text-sm text-slate-300", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                      "input",
                      {
                        type: "checkbox",
                        checked: proveOutEnabled,
                        onChange: (e) => setProveOutEnabled(e.target.checked),
                        className: "h-4 w-4 rounded border-white/20 bg-black/30 accent-amber-400"
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { children: "Prove-out mode" }),
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { className: "text-xs text-slate-500", children: "(80% speed, 50% feed)" })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                    ActionButton,
                    {
                      onClick: async () => {
                        try {
                          const res = await ppgDownload({
                            post_name: generated.post_name,
                            controller: generated.controller,
                            preview: generated.preview
                          });
                          const blob = new Blob([String(res.result ?? generated.preview)], { type: "text/plain" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `${generated.post_name}.cps`;
                          a.click();
                          URL.revokeObjectURL(url);
                        } catch {
                          const blob = new Blob([generated.preview || ""], { type: "text/plain" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `${generated.post_name}.cps`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }
                      },
                      children: "Download CPS"
                    }
                  )
                ] }),
                originalGcode && generated.preview && originalGcode !== generated.preview && /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("details", { className: "rounded-[16px] border border-white/6 bg-white/[0.01]", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("summary", { className: "cursor-pointer px-4 py-3 text-sm font-semibold text-slate-300 hover:text-cyan-400", children: [
                    "View optimization diff (",
                    generated.preview.split("\n").length - originalGcode.split("\n").length > 0 ? "+" : "",
                    generated.preview.split("\n").length - originalGcode.split("\n").length,
                    " lines)"
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "border-t border-white/6 p-4", children: /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                    GcodeComparisonPanel,
                    {
                      traditional: originalGcode,
                      optimized: generated.preview,
                      controller: generated.controller
                    }
                  ) })
                ] }),
                generated.preview && /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                  GcodePreviewPanel,
                  {
                    code: generated.preview,
                    title: generated.post_name
                  }
                )
              ] })
            ] })
          ]
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
          "button",
          {
            className: "rounded-full border border-white/10 bg-white/[0.03] px-5 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.06] disabled:opacity-30",
            onClick: () => setWizardStep(wizardStep - 1),
            disabled: wizardStep === 1,
            children: "Back"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "text-xs text-slate-500", children: [
          "Step ",
          wizardStep,
          " of 5"
        ] }),
        wizardStep < 5 ? /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
          "button",
          {
            className: "rounded-full border border-cyan-400/30 bg-cyan-500/15 px-5 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-500/25 disabled:opacity-30",
            onClick: () => setWizardStep(wizardStep + 1),
            disabled: !canAdvanceWizard,
            children: "Next"
          }
        ) : /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", {})
      ] })
    ] }),
    pageMode === "lanes" && /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(import_jsx_runtime13.Fragment, { children: [
      !generated && /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("details", { className: "group rounded-[24px] border border-cyan-300/10 bg-cyan-950/10", children: [
        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("summary", { className: "cursor-pointer px-5 py-4 text-sm font-semibold text-cyan-400 hover:text-cyan-300 focus:outline-2 focus:outline-offset-2 focus:outline-cyan-500 [&::-webkit-details-marker]:hidden list-none", children: /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("span", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("svg", { width: "14", height: "14", viewBox: "0 0 14 14", fill: "none", className: "transition group-open:rotate-90", children: /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("path", { d: "M5 3l4 4-4 4", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) }),
          "Getting Started \u2014 How to generate your first optimized post"
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "border-t border-cyan-300/10 px-5 py-4", children: [
          /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("ol", { className: "space-y-3 text-sm text-slate-300", children: [
            /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("li", { className: "flex gap-3", children: [
              /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { className: "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-950/50 text-[10px] font-bold text-cyan-400", children: "1" }),
              /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("span", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("strong", { className: "text-white", children: "Select your machine posture" }),
                " \u2014 Pick 3-axis VMC, 5-axis, lathe, or mill-turn. This sets the controller dialect and available features."
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("li", { className: "flex gap-3", children: [
              /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { className: "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-950/50 text-[10px] font-bold text-cyan-400", children: "2" }),
              /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("span", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("strong", { className: "text-white", children: "Choose your controller" }),
                " \u2014 Haas NGC, Fanuc 31i, Siemens 840D, etc. The post will use your controller's exact M-codes and formatting."
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("li", { className: "flex gap-3", children: [
              /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { className: "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-950/50 text-[10px] font-bold text-cyan-400", children: "3" }),
              /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("span", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("strong", { className: "text-white", children: "Paste or upload G-code" }),
                " \u2014 Use the text area below to paste your CAM output, or use the default sample program."
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("li", { className: "flex gap-3", children: [
              /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { className: "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-950/50 text-[10px] font-bold text-cyan-400", children: "4" }),
              /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("span", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("strong", { className: "text-white", children: "Generate" }),
                " \u2014 PRISM runs the 38-stage physics pipeline. You'll see per-block S/F with force, confidence, and finish predictions."
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("li", { className: "flex gap-3", children: [
              /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { className: "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-950/50 text-[10px] font-bold text-cyan-400", children: "5" }),
              /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("span", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("strong", { className: "text-white", children: "Validate + Download" }),
                " \u2014 Run machine limit validation, enable prove-out mode if desired, then download in your controller's native format."
              ] })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "mt-4 flex flex-wrap gap-3 text-xs text-slate-400", children: [
            /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { title: "Tooltip: Machine posture determines which controller dialects and features are available", children: "Machine posture = controller + features" }),
            /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { className: "text-slate-600", children: "|" }),
            /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { title: "Tooltip: Prove-out mode reduces feeds by 25% and caps RPM to 80% for safe first-article runs", children: "Prove-out mode = safe first-article" }),
            /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { className: "text-slate-600", children: "|" }),
            /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { title: "Tooltip: The safety chain validates spindle limits, rapid heights, coolant calls, and tool changes", children: "Safety chain = 6-stage automated" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.9fr)]", children: [
        /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "space-y-6", children: [
          /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(
            PanelCard,
            {
              title: "Post build posture",
              subtitle: "Controller coverage, prove-out posture, and release continuity all move together here.",
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "grid gap-4 md:grid-cols-2", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(Field, { label: "CAM software", children: /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                    Select,
                    {
                      "aria-label": "CAM software",
                      value: camSystem,
                      onChange: (event) => setCamSystem(event.target.value),
                      children: CAM_PACKAGES.map((item) => /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("option", { value: item.value, children: item.label }, item.value))
                    }
                  ) }),
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(Field, { label: "Machine posture", children: /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                    Select,
                    {
                      "aria-label": "Machine posture",
                      value: machinePosture,
                      onChange: (event) => setMachinePosture(event.target.value),
                      children: MACHINE_POSTURES.map((item) => /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("option", { value: item.value, children: item.label }, item.value))
                    }
                  ) }),
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(Field, { label: "Controller", children: /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                    Select,
                    {
                      "aria-label": "Controller",
                      value: controller,
                      onChange: (event) => setController(event.target.value),
                      children: controllers.map((item) => /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("option", { value: item.value, children: item.label }, item.value))
                    }
                  ) }),
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(Field, { label: "Operation", children: /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                    Select,
                    {
                      "aria-label": "Operation",
                      value: operation,
                      onChange: (event) => setOperation(event.target.value),
                      children: operations.map((item) => /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("option", { value: item.value, children: item.label }, item.value))
                    }
                  ) }),
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(Field, { label: "Program style", children: /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(
                    Select,
                    {
                      "aria-label": "Program style",
                      value: strategy,
                      onChange: (event) => setStrategy(event.target.value),
                      children: [
                        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("option", { value: "ai_enhanced", children: "AI-enhanced release" }),
                        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("option", { value: "production_safe", children: "Production safe" }),
                        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("option", { value: "prove_out", children: "Operator prove-out" }),
                        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("option", { value: "multi_operation", children: "Multi-operation packet" })
                      ]
                    }
                  ) }),
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(Field, { label: "Compare target", children: /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                    Select,
                    {
                      "aria-label": "Compare target",
                      value: selectedCompareTarget.value,
                      onChange: (event) => setCompareTarget(event.target.value),
                      children: compareTargets.map((item) => /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("option", { value: item.value, children: item.label }, item.value))
                    }
                  ) }),
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(Field, { label: "Machine model", children: /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                    Input,
                    {
                      "aria-label": "Machine model",
                      value: machineModel,
                      onChange: (event) => setMachineModel(event.target.value),
                      placeholder: "Haas VF-2SS"
                    }
                  ) }),
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(Field, { label: "Post name", children: /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                    Input,
                    {
                      "aria-label": "Post name",
                      value: programName,
                      onChange: (event) => setProgramName(event.target.value),
                      placeholder: "PRISM_VF2_PRODUCTION"
                    }
                  ) })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "mt-5 ppg-saber ppg-saber--emerald-cyan ppg-saber-pulse", children: /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "ppg-saber-inner p-5", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "ppg-saber-sweep" }),
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "relative z-10", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "mb-4 flex items-center justify-between", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { children: [
                        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "text-lg font-bold text-slate-50", children: "Material & Tooling" }),
                        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "text-sm text-slate-400", children: "Select material and tool for physics-based auto speed/feed" })
                      ] }),
                      selectedMaterialId && parseFloat(toolDiameter) > 0 && /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { className: "rounded-full border border-emerald-400/40 bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,.15)]", children: "Auto S/F: ON" })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "grid gap-4 md:grid-cols-2", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { children: [
                        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("label", { className: "mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400", children: "Work Material" }),
                        /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "relative", children: [
                          /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                            "input",
                            {
                              type: "text",
                              value: materialSearchQuery,
                              onChange: (e) => {
                                setMaterialSearchQuery(e.target.value);
                                handleMaterialSearch(e.target.value);
                              },
                              placeholder: "Search: 4140, 6061, 304 SS, Ti-6Al-4V...",
                              className: "w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-300/32"
                            }
                          ),
                          materialSearchResults.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-white/10 bg-slate-900/95 shadow-xl", children: materialSearchResults.map((mat) => /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(
                            "button",
                            {
                              onClick: () => selectMaterial(mat),
                              className: "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition hover:bg-emerald-500/10",
                              children: [
                                /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("span", { className: `rounded px-1.5 py-0.5 text-[10px] font-bold ${mat.iso_group === "P" ? "bg-blue-500/20 text-blue-300" : mat.iso_group === "M" ? "bg-yellow-500/20 text-yellow-300" : mat.iso_group === "K" ? "bg-red-500/20 text-red-300" : mat.iso_group === "N" ? "bg-green-500/20 text-green-300" : mat.iso_group === "S" ? "bg-orange-500/20 text-orange-300" : "bg-purple-500/20 text-purple-300"}`, children: [
                                  "ISO ",
                                  mat.iso_group
                                ] }),
                                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { className: "flex-1 text-slate-200", children: mat.name }),
                                /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("span", { className: "text-[10px] text-slate-500", children: [
                                  "kc=",
                                  mat.kc1_1
                                ] })
                              ]
                            },
                            mat.id
                          )) })
                        ] }),
                        selectedMaterialId && /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "mt-2 flex items-center gap-2 text-xs text-slate-400", children: [
                          /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("span", { className: `rounded px-1.5 py-0.5 text-[10px] font-bold ${selectedMaterialIso === "P" ? "bg-blue-500/20 text-blue-300" : selectedMaterialIso === "M" ? "bg-yellow-500/20 text-yellow-300" : selectedMaterialIso === "K" ? "bg-red-500/20 text-red-300" : selectedMaterialIso === "N" ? "bg-green-500/20 text-green-300" : selectedMaterialIso === "S" ? "bg-orange-500/20 text-orange-300" : "bg-purple-500/20 text-purple-300"}`, children: [
                            "ISO ",
                            selectedMaterialIso
                          ] }),
                          "kc1.1=",
                          selectedMaterialKc,
                          " N/mm\xB2 | mc=",
                          selectedMaterialMc
                        ] })
                      ] }),
                      /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { children: [
                        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("label", { className: "mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400", children: "Cutting Tool" }),
                        /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "grid grid-cols-2 gap-2", children: [
                          /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(
                            "select",
                            {
                              value: toolType,
                              onChange: (e) => setToolType(e.target.value),
                              className: "rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none",
                              children: [
                                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("option", { value: "flat_endmill", children: "Flat End Mill" }),
                                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("option", { value: "ball_endmill", children: "Ball End Mill" }),
                                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("option", { value: "bull_nose", children: "Bull Nose" }),
                                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("option", { value: "face_mill", children: "Face Mill" }),
                                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("option", { value: "drill", children: "Drill" }),
                                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("option", { value: "tap", children: "Tap" }),
                                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("option", { value: "reamer", children: "Reamer" }),
                                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("option", { value: "chamfer", children: "Chamfer" }),
                                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("option", { value: "boring_bar", children: "Boring Bar" }),
                                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("option", { value: "insert_mill", children: "Insert Mill" }),
                                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("option", { value: "thread_mill", children: "Thread Mill" }),
                                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("option", { value: "slot_drill", children: "Slot Drill" })
                              ]
                            }
                          ),
                          /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(
                            "select",
                            {
                              value: toolMaterial,
                              onChange: (e) => setToolMaterial(e.target.value),
                              className: "rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none",
                              children: [
                                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("option", { value: "carbide", children: "Carbide" }),
                                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("option", { value: "hss", children: "HSS" }),
                                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("option", { value: "cermet", children: "Cermet" }),
                                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("option", { value: "ceramic", children: "Ceramic" }),
                                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("option", { value: "cbn", children: "CBN" }),
                                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("option", { value: "pcd", children: "PCD" })
                              ]
                            }
                          ),
                          /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "relative", children: [
                            /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                              "input",
                              {
                                type: "number",
                                value: toolDiameter,
                                onChange: (e) => setToolDiameter(e.target.value),
                                min: "0.1",
                                step: "0.5",
                                className: "w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none",
                                placeholder: "Diameter"
                              }
                            ),
                            /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { className: "pointer-events-none absolute right-3 top-3 text-xs text-slate-500", children: "mm" })
                          ] }),
                          /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "relative", children: [
                            /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                              "input",
                              {
                                type: "number",
                                value: toolFlutes,
                                onChange: (e) => setToolFlutes(e.target.value),
                                min: "1",
                                max: "16",
                                className: "w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none",
                                placeholder: "Flutes"
                              }
                            ),
                            /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { className: "pointer-events-none absolute right-3 top-3 text-xs text-slate-500", children: "flutes" })
                          ] })
                        ] })
                      ] })
                    ] })
                  ] })
                ] }) }),
                /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "mt-5 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(Field, { label: "Post notes", children: /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                    "textarea",
                    {
                      "aria-label": "Post notes",
                      value: notes,
                      onChange: (event) => setNotes(event.target.value),
                      rows: 6,
                      className: "w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/32"
                    }
                  ) }),
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(Field, { label: "Program text", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(
                      "div",
                      {
                        className: `relative rounded-2xl border-2 border-dashed transition ${isDragOver ? "border-cyan-400/60 bg-cyan-400/[0.06]" : "border-white/10 bg-transparent"}`,
                        onDragOver: handleDragOver,
                        onDragLeave: handleDragLeave,
                        onDrop: handleDrop,
                        children: [
                          /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                            "textarea",
                            {
                              "aria-label": "Program text",
                              value: gcodeInput,
                              onChange: (event) => {
                                setGcodeInput(event.target.value);
                                if (!originalGcode) setOriginalGcode(event.target.value);
                              },
                              rows: 12,
                              className: "font-mono w-full rounded-2xl border-0 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/32",
                              placeholder: "Paste G-code, type it, or drag-drop an NC file here..."
                            }
                          ),
                          isDragOver && /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-cyan-400/10", children: /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { className: "text-lg font-bold text-cyan-300", children: "Drop NC file here" }) })
                        ]
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "mt-2 flex items-center gap-3", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("label", { className: "cursor-pointer rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-400/20", children: [
                        "Upload File",
                        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                          "input",
                          {
                            type: "file",
                            accept: ".nc,.gcode,.ngc,.tap,.mpf,.spf,.h,.cnc,.eia,.prg",
                            onChange: handleFileInputChange,
                            className: "hidden"
                          }
                        )
                      ] }),
                      fileName && /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("span", { className: "text-xs text-slate-400", children: [
                        fileName,
                        " (",
                        (fileSize / 1024).toFixed(1),
                        " KB, ",
                        gcodeInput.split("\n").length,
                        " lines)"
                      ] }),
                      detectedController && /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("span", { className: "rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-300", children: [
                        "Detected: ",
                        detectedController,
                        " (",
                        detectedConfidence,
                        ")"
                      ] })
                    ] })
                  ] })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "mt-5 flex flex-wrap gap-3", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(ActionButton, { disabled: loadingAction, onClick: handleGenerate, children: "Generate Post" }),
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                    ActionButton,
                    {
                      tone: "emerald",
                      disabled: loadingAction,
                      onClick: handleValidate,
                      children: "Validate Program"
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                    ActionButton,
                    {
                      tone: "amber",
                      disabled: loadingAction,
                      onClick: handleCompare,
                      children: "Compare Controllers"
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "ml-auto flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-1.5", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { className: "text-[10px] uppercase tracking-widest text-slate-500", children: "Output" }),
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                      "button",
                      {
                        onClick: () => setOutputMode("pipeline_optimized"),
                        className: `rounded-lg px-2.5 py-1 text-xs font-semibold transition ${outputMode === "pipeline_optimized" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "text-slate-500 hover:text-slate-300"}`,
                        children: "Full PRISM"
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                      "button",
                      {
                        onClick: () => setOutputMode("self_contained"),
                        className: `rounded-lg px-2.5 py-1 text-xs font-semibold transition ${outputMode === "self_contained" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "text-slate-500 hover:text-slate-300"}`,
                        children: "Standalone"
                      }
                    )
                  ] })
                ] })
              ]
            }
          ),
          lane === "generate" && /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(import_jsx_runtime13.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(
              PanelCard,
              {
                title: "Generated post brief",
                subtitle: "Turn the controller decision into a release packet instead of a raw NC fragment.",
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "grid gap-3 sm:grid-cols-2 xl:grid-cols-4", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                      SummaryTile,
                      {
                        label: "Post name",
                        value: generated?.post_name ?? programName,
                        hint: selectedController.label,
                        accent: "from-sky-400/22 via-sky-300/10 to-transparent"
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                      SummaryTile,
                      {
                        label: "Operation",
                        value: generated?.operation ?? selectedOperation.label,
                        hint: selectedMachinePosture.label,
                        accent: "from-violet-400/22 via-violet-300/10 to-transparent"
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                      SummaryTile,
                      {
                        label: "Estimated lines",
                        value: String(generated?.estimated_lines ?? gcodeInput.split("\n").filter(Boolean).length),
                        hint: "Readable prove-out packet",
                        accent: "from-emerald-400/20 via-emerald-300/10 to-transparent"
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                      SummaryTile,
                      {
                        label: "Optimization",
                        value: generated?.optimization_package ?? `${selectedMachinePosture.label} release`,
                        hint: recommendedTier,
                        accent: "from-amber-400/22 via-amber-300/10 to-transparent"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "mt-5 grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "space-y-3", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "text-xs font-semibold uppercase tracking-[0.18em] text-slate-400", children: "Included capabilities" }),
                      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "flex flex-wrap gap-2", children: (generated?.capabilities ?? selectedCapabilityDetails.map((item) => item.label)).map(
                        (capability) => /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(StatusPill, { label: capability, tone: "sky" }, capability)
                      ) })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "space-y-3", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "text-xs font-semibold uppercase tracking-[0.18em] text-slate-400", children: "Preview" }),
                      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                        PostPreviewComponent,
                        {
                          gcode: generated?.preview ?? gcodeInput,
                          controller: selectedController.label,
                          onDownload: () => {
                            ppgDownload({
                              gcode: generated?.preview ?? gcodeInput,
                              controller,
                              machine_brand: machineModel.split(" ")[0],
                              machine_model: machineModel,
                              program_name: programName,
                              include_physics_comments: true
                            }).catch(() => {
                            });
                          }
                        }
                      )
                    ] })
                  ] })
                ]
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(
              PanelCard,
              {
                title: "Prove-out & validation",
                subtitle: "Conservative first-article settings and machine limit checking.",
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "flex items-center gap-4", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("label", { className: "flex cursor-pointer items-center gap-2", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                        "input",
                        {
                          type: "checkbox",
                          checked: proveOutEnabled,
                          onChange: (e) => {
                            setProveOutEnabled(e.target.checked);
                            if (e.target.checked) {
                              const gcode = generated?.preview ?? gcodeInput;
                              ppgProveOut({ gcode, controller }).then((res) => {
                                const d = res?.data;
                                if (d) setProveOutResult(d);
                              }).catch(() => {
                              });
                            } else {
                              setProveOutResult(null);
                            }
                          },
                          className: "h-4 w-4 rounded border-white/20 bg-slate-800 text-amber-500 focus:ring-amber-500/30"
                        }
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { className: "text-sm font-medium text-slate-200", children: "Enable prove-out mode" })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                      ActionButton,
                      {
                        size: "sm",
                        disabled: loadingAction || !generated,
                        onClick: () => {
                          const gcode = proveOutResult?.gcode ?? generated?.preview ?? gcodeInput;
                          ppgValidateLimits({ gcode, machine: { id: "auto", name: machineModel, brand: machineModel.split(" ")[0], controller, max_rpm: 12e3, max_power_kW: 22, work_volume: { x: 762, y: 508, z: 635 }, rapid_rate_mm_min: { x: 25400, y: 25400, z: 25400 }, axes: 3 } }).then((res) => {
                            const d = res?.data?.summary;
                            const flags = res?.data?.flags ?? [];
                            if (d) setValidationResult({ ...d, flags });
                          }).catch(() => {
                          });
                        },
                        children: "Validate Limits"
                      }
                    )
                  ] }),
                  proveOutResult && /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "mt-4 grid gap-3 sm:grid-cols-4", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                      SummaryTile,
                      {
                        label: "Feed reductions",
                        value: String(proveOutResult.summary.feed_reductions),
                        hint: `Avg -${proveOutResult.summary.avg_feed_reduction_pct}%`,
                        accent: "from-amber-400/22 via-amber-300/10 to-transparent"
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                      SummaryTile,
                      {
                        label: "RPM caps",
                        value: String(proveOutResult.summary.rpm_caps),
                        hint: `Avg -${proveOutResult.summary.avg_rpm_reduction_pct}%`,
                        accent: "from-amber-400/22 via-amber-300/10 to-transparent"
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                      SummaryTile,
                      {
                        label: "Optional stops",
                        value: String(proveOutResult.summary.optional_stops_added),
                        hint: "At critical transitions",
                        accent: "from-emerald-400/20 via-emerald-300/10 to-transparent"
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                      SummaryTile,
                      {
                        label: "Cycle time",
                        value: `${proveOutResult.estimated_cycle_time_ratio}x`,
                        hint: "vs production",
                        accent: "from-sky-400/22 via-sky-300/10 to-transparent"
                      }
                    )
                  ] }),
                  validationResult && /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "mt-4 space-y-3", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "flex items-center gap-3", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                        StatusPill,
                        {
                          label: validationResult.passed ? "PASSED" : "FAILED",
                          tone: validationResult.passed ? "emerald" : "rose"
                        }
                      ),
                      validationResult.block_count > 0 && /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(StatusPill, { label: `${validationResult.block_count} blocking`, tone: "rose" }),
                      validationResult.warn_count > 0 && /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(StatusPill, { label: `${validationResult.warn_count} warnings`, tone: "amber" })
                    ] }),
                    validationResult.flags.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "max-h-48 overflow-y-auto rounded-lg border border-white/10 bg-slate-950/80 p-3 text-xs", children: validationResult.flags.slice(0, 20).map((flag, idx) => /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: `py-1 ${flag.severity === "BLOCK" ? "text-rose-400" : flag.severity === "WARN" ? "text-amber-400" : "text-slate-400"}`, children: [
                      /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("span", { className: "font-mono", children: [
                        "L",
                        flag.line
                      ] }),
                      " [",
                      flag.severity,
                      "] ",
                      flag.message,
                      flag.suggestion && /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("span", { className: "ml-2 text-slate-500", children: [
                        "\u2014 ",
                        flag.suggestion
                      ] })
                    ] }, idx)) })
                  ] })
                ]
              }
            ),
            comparison && (comparison.baseline_gcode || comparison.target_gcode) && /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
              GcodeComparisonPanel,
              {
                traditional: comparison.baseline_gcode || "",
                optimized: comparison.target_gcode || "",
                controller: selectedController.label
              }
            ),
            generated && /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "ppg-saber ppg-saber--cyan-blue ppg-saber-pulse", children: /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "ppg-saber-inner p-5", children: [
              /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "ppg-saber-sweep" }),
              /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "relative z-10", children: [
                /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "mb-4 flex items-center justify-between", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { children: [
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "text-lg font-bold text-slate-50", children: "Output Actions" }),
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "text-sm text-slate-400", children: "Download optimized program or copy to clipboard" })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "flex gap-2", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(
                      "button",
                      {
                        onClick: handleDownload,
                        className: "flex items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-400/15 px-4 py-2 text-sm font-bold text-cyan-200 transition hover:bg-cyan-400/25 hover:shadow-[0_0_20px_rgba(34,211,238,.2)]",
                        children: [
                          /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("svg", { className: "h-4 w-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3" }) }),
                          "Download .nc"
                        ]
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                      "button",
                      {
                        onClick: handleCopyToClipboard,
                        className: `flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition ${copySuccess ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-200" : "border-cyan-400/40 bg-cyan-400/15 text-cyan-200 hover:bg-cyan-400/25"}`,
                        children: copySuccess ? /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(import_jsx_runtime13.Fragment, { children: [
                          /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("svg", { className: "h-4 w-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2.5, children: /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M5 13l4 4L19 7" }) }),
                          "Copied!"
                        ] }) : /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(import_jsx_runtime13.Fragment, { children: [
                          /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("svg", { className: "h-4 w-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" }) }),
                          "Copy"
                        ] })
                      }
                    )
                  ] })
                ] }),
                fileName && /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "text-xs text-slate-500", children: [
                  "Output: ",
                  fileName.replace(/\.[^.]+$/, ""),
                  "_PRISM_optimized.nc"
                ] })
              ] })
            ] }) }),
            pipelineResult && /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "ppg-saber ppg-saber--emerald-cyan ppg-saber-pulse", children: /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "ppg-saber-inner p-5", children: [
              /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "ppg-saber-sweep" }),
              /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "relative z-10", children: [
                /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "mb-4", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "text-lg font-bold text-slate-50", children: "Physics Summary" }),
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "text-sm text-slate-400", children: "Real-time cutting force, power, and tool life from PRISM pipeline" })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "grid gap-3 sm:grid-cols-2 xl:grid-cols-4", children: (() => {
                  const stages = pipelineResult.stages ?? [];
                  const sf = stages.find((s) => s.stage === "1.1_base_speed_feed");
                  const analytics = pipelineResult.analytics;
                  const passCount = stages.filter((s) => s.status === "pass").length;
                  const totalStages = stages.length;
                  const safetyStage = stages.find((s) => s.stage?.includes("omega") || s.stage?.includes("safety"));
                  const wearStage = stages.find((s) => s.stage?.includes("wear") || s.stage?.includes("2.7b"));
                  const safetyScore = safetyStage?.data?.score ?? null;
                  const overall = analytics?.overall ?? {};
                  const perOp = analytics?.per_operation ?? [];
                  return /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(import_jsx_runtime13.Fragment, { children: [
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-3", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "text-[10px] uppercase tracking-widest text-slate-500", children: "Pipeline Stages" }),
                      /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "mt-1 text-2xl font-black text-cyan-300", children: [
                        passCount,
                        "/",
                        totalStages
                      ] }),
                      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "text-[11px] text-slate-400", children: "stages passed" })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "text-[10px] uppercase tracking-widest text-slate-500", children: "Cutting Force" }),
                      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "mt-1 text-2xl font-black text-emerald-300", children: sf?.data?.kc1_1 ? `${Math.round(sf.data.kc1_1)} N/mm\xB2` : perOp[0]?.force_range_N ? `${Math.round(perOp[0].force_range_N[1])} N` : "\u2014" }),
                      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "text-[11px] text-slate-400", children: String(sf?.data?.calibration_source ?? "canonical") })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "rounded-xl border border-amber-400/20 bg-amber-400/5 p-3", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "text-[10px] uppercase tracking-widest text-slate-500", children: "Cycle Time" }),
                      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "mt-1 text-2xl font-black text-amber-300", children: overall.total_cycle_time_s ? `${(overall.total_cycle_time_s / 60).toFixed(1)} min` : "\u2014" }),
                      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "text-[11px] text-slate-400", children: overall.cutting_time_s ? `${(overall.cutting_time_s / 60).toFixed(1)} min cutting` : "" })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "rounded-xl border border-violet-400/20 bg-violet-400/5 p-3", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "text-[10px] uppercase tracking-widest text-slate-500", children: "Safety Score" }),
                      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: `mt-1 text-2xl font-black ${safetyScore != null && safetyScore >= 0.7 ? "text-emerald-300" : safetyScore != null ? "text-rose-300" : "text-slate-500"}`, children: safetyScore != null ? (safetyScore * 100).toFixed(0) + "%" : wearStage ? "OK" : "\u2014" }),
                      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "text-[11px] text-slate-400", children: safetyScore != null && safetyScore >= 0.7 ? "PASS" : safetyScore != null ? "REVIEW" : "" })
                    ] })
                  ] });
                })() }),
                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "mt-3 flex flex-wrap gap-1.5", children: (pipelineResult.stages ?? []).filter((s) => s.status === "pass" && !s.stage.startsWith("0.")).slice(0, 12).map((s) => /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { className: "rounded-full bg-slate-800/60 px-2 py-0.5 text-[9px] font-semibold text-slate-400", children: s.stage.replace(/_/g, " ") }, s.stage)) })
              ] })
            ] }) }),
            generated && originalGcode && /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "ppg-saber ppg-saber--amber-gold ppg-saber-pulse", children: /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "ppg-saber-inner p-5", children: [
              /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "ppg-saber-sweep" }),
              /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "relative z-10", children: [
                /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "mb-4 flex items-center justify-between", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { children: [
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "text-lg font-bold text-slate-50", children: "Optimization Diff" }),
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "text-sm text-slate-400", children: "Compare original vs optimized \u2014 see every S/F change" })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                    "button",
                    {
                      onClick: () => setShowDiff(!showDiff),
                      className: "rounded-xl border border-amber-400/40 bg-amber-400/15 px-4 py-2 text-sm font-bold text-amber-200 transition hover:bg-amber-400/25 hover:shadow-[0_0_20px_rgba(245,158,11,.2)]",
                      children: showDiff ? "Hide Diff" : "Show Diff"
                    }
                  )
                ] }),
                showDiff && /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "mt-3", children: (() => {
                  const origLines = originalGcode.split("\n");
                  const optLines = (generated.preview ?? "").split("\n");
                  const maxLines = Math.max(origLines.length, optLines.length);
                  let changedCount = 0;
                  const diffRows = [];
                  for (let i = 0; i < maxLines; i++) {
                    const orig = origLines[i] ?? "";
                    const opt = optLines[i] ?? "";
                    const changed = orig !== opt;
                    if (changed) changedCount++;
                    let reason = "";
                    if (changed) {
                      if (/[SF]\d/i.test(opt) && /[SF]\d/i.test(orig)) reason = "S/F optimized";
                      else if (opt && !orig) reason = "Added";
                      else if (!opt && orig) reason = "Removed";
                      else reason = "Modified";
                    }
                    diffRows.push({ idx: i + 1, orig, opt, changed, reason });
                  }
                  return /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(import_jsx_runtime13.Fragment, { children: [
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "mb-3 flex gap-4 text-xs", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("span", { className: "text-slate-400", children: [
                        maxLines,
                        " lines total"
                      ] }),
                      /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("span", { className: "text-amber-300 font-semibold", children: [
                        changedCount,
                        " lines changed"
                      ] }),
                      /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("span", { className: "text-slate-500", children: [
                        (changedCount / maxLines * 100).toFixed(1),
                        "% modified"
                      ] })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "max-h-[400px] overflow-auto rounded-xl border border-white/5 bg-slate-950/60", children: /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "grid grid-cols-[3rem_1fr_1fr_8rem] text-xs font-mono", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "sticky top-0 z-10 border-b border-white/10 bg-slate-900/90 p-2 text-center text-slate-500", children: "#" }),
                      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "sticky top-0 z-10 border-b border-white/10 bg-slate-900/90 p-2 text-slate-400 font-sans font-semibold", children: "Original" }),
                      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "sticky top-0 z-10 border-b border-white/10 bg-slate-900/90 p-2 text-slate-400 font-sans font-semibold", children: "Optimized" }),
                      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "sticky top-0 z-10 border-b border-white/10 bg-slate-900/90 p-2 text-slate-400 font-sans font-semibold", children: "Reason" }),
                      diffRows.map((row) => /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "contents", children: [
                        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: `border-b border-white/5 p-1.5 text-center ${row.changed ? "text-amber-400" : "text-slate-600"}`, children: row.idx }),
                        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: `border-b border-white/5 p-1.5 ${row.changed ? "bg-rose-500/[0.08] text-rose-300" : "text-slate-500"}`, children: row.orig || "\xA0" }),
                        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: `border-b border-white/5 p-1.5 ${row.changed ? "bg-emerald-500/[0.08] text-emerald-300" : "text-slate-500"}`, children: row.opt || "\xA0" }),
                        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: `border-b border-white/5 p-1.5 font-sans text-[0.65rem] ${row.changed ? "text-amber-400/70" : "text-transparent"}`, children: row.reason })
                      ] }, row.idx))
                    ] }) })
                  ] });
                })() })
              ] })
            ] }) }),
            /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "ppg-saber ppg-saber--violet-rose ppg-saber-pulse", children: /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "ppg-saber-inner p-5", children: [
              /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "ppg-saber-sweep" }),
              /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "relative z-10", children: [
                /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "mb-4 flex items-center justify-between", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { children: [
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "text-lg font-bold text-slate-50", children: "Session History" }),
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "text-sm text-slate-400", children: "Recent post-processor runs \u2014 click to reload" })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                    "button",
                    {
                      onClick: loadHistory,
                      disabled: historyLoading,
                      className: "rounded-xl border border-violet-400/40 bg-violet-400/15 px-4 py-2 text-sm font-bold text-violet-200 transition hover:bg-violet-400/25 hover:shadow-[0_0_20px_rgba(139,92,246,.2)]",
                      children: historyLoading ? "Loading..." : "Load History"
                    }
                  )
                ] }),
                history.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "space-y-2", children: history.slice(0, 20).map((entry, idx) => /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(
                  "button",
                  {
                    onClick: () => {
                      setGcodeInput(entry.id);
                      setLane("generate");
                    },
                    className: "flex w-full items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 text-left text-sm transition hover:border-violet-400/30 hover:bg-violet-400/[0.06]",
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "flex items-center gap-3", children: [
                        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { className: "text-xs text-slate-500", children: entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : `#${idx + 1}` }),
                        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { className: "font-semibold text-slate-200", children: entry.controller || "Unknown" }),
                        /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("span", { className: "text-xs text-slate-500", children: [
                          entry.lines ?? 0,
                          " lines"
                        ] })
                      ] }),
                      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { className: `rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase ${entry.status === "ready" ? "bg-emerald-500/15 text-emerald-400" : entry.status === "review" ? "bg-amber-500/15 text-amber-400" : "bg-slate-500/15 text-slate-400"}`, children: entry.status || "done" })
                    ]
                  },
                  entry.id ?? idx
                )) }) : /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "py-8 text-center text-sm text-slate-500", children: historyLoading ? "Loading history..." : "No history yet \u2014 generate a post to start building history" })
              ] })
            ] }) })
          ] }),
          lane === "validate" && /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(
            PanelCard,
            {
              title: "Controller validation desk",
              subtitle: "Blend program checks with release-gate posture so operators do not inherit blind risk.",
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "grid gap-3 sm:grid-cols-3", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                    SummaryTile,
                    {
                      label: "Status",
                      value: (validation?.status ?? "review").toUpperCase(),
                      hint: validation?.controller ?? selectedController.label,
                      accent: "from-emerald-400/20 via-emerald-300/10 to-transparent"
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                    SummaryTile,
                    {
                      label: "Readiness",
                      value: `${Math.round((validation?.score ?? 0.84) * 100)}%`,
                      hint: "Controller confidence",
                      accent: "from-cyan-400/22 via-cyan-300/10 to-transparent"
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                    SummaryTile,
                    {
                      label: "Warnings",
                      value: String(validation?.warnings.length ?? releaseChecks.filter((item) => item.status !== "ready").length),
                      hint: "Issues needing review",
                      accent: "from-amber-400/22 via-amber-300/10 to-transparent"
                    }
                  )
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "mt-5 grid gap-5 lg:grid-cols-2", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "rounded-[22px] border border-emerald-300/12 bg-emerald-300/[0.05] p-4", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/90", children: "Passes" }),
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("ul", { className: "mt-3 space-y-2 text-sm text-slate-200", children: (validation?.passes ?? []).map((item) => /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("li", { children: [
                      "\u2022 ",
                      item
                    ] }, item)) })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "rounded-[22px] border border-amber-300/12 bg-amber-300/[0.06] p-4", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "text-xs font-semibold uppercase tracking-[0.18em] text-amber-100/90", children: "Warnings" }),
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("ul", { className: "mt-3 space-y-2 text-sm text-slate-200", children: (validation?.warnings ?? []).map((item) => /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("li", { children: [
                      "\u2022 ",
                      item
                    ] }, item)) })
                  ] })
                ] })
              ]
            }
          ),
          lane === "compare" && /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(
            PanelCard,
            {
              title: "Controller comparison",
              subtitle: "Make controller changes explainable before a programmer or operator trusts the packet.",
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "grid gap-3 sm:grid-cols-2", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                    SummaryTile,
                    {
                      label: "Baseline",
                      value: comparison?.baseline ?? selectedController.label,
                      hint: "Current packet controller",
                      accent: "from-sky-400/22 via-sky-300/10 to-transparent"
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                    SummaryTile,
                    {
                      label: "Target",
                      value: comparison?.target ?? selectedCompareTarget.label,
                      hint: "Comparison controller",
                      accent: "from-violet-400/22 via-violet-300/10 to-transparent"
                    }
                  )
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "rounded-[22px] border border-white/10 bg-white/[0.03] p-4", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "text-xs font-semibold uppercase tracking-[0.18em] text-slate-400", children: "Delta summary" }),
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("ul", { className: "mt-3 space-y-2 text-sm text-slate-200", children: (comparison?.delta_summary ?? []).map((item) => /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("li", { children: [
                      "\u2022 ",
                      item
                    ] }, item)) })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "grid gap-4", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "rounded-[22px] border border-white/10 bg-white/[0.03] p-4", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "text-xs font-semibold uppercase tracking-[0.18em] text-slate-400", children: "Baseline notes" }),
                      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("ul", { className: "mt-3 space-y-2 text-sm text-slate-200", children: (comparison?.baseline_notes ?? []).map((item) => /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("li", { children: [
                        "\u2022 ",
                        item
                      ] }, item)) })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "rounded-[22px] border border-white/10 bg-white/[0.03] p-4", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "text-xs font-semibold uppercase tracking-[0.18em] text-slate-400", children: "Target notes" }),
                      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("ul", { className: "mt-3 space-y-2 text-sm text-slate-200", children: (comparison?.target_notes ?? []).map((item) => /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("li", { children: [
                        "\u2022 ",
                        item
                      ] }, item)) })
                    ] })
                  ] })
                ] })
              ]
            }
          ),
          lane === "library" && /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
            PanelCard,
            {
              title: "Post library",
              subtitle: "Browse and search available post processors. Select one to pre-fill your machine configuration.",
              children: /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                PostLibraryUI,
                {
                  onSelectPost: () => {
                  },
                  onGenerateForMachine: (post) => {
                    setController(post.controller);
                    setMachineModel(post.vendor === "PRISM" ? post.name.replace("PRISM ", "") : `${post.vendor} ${post.name}`);
                    if (post.machine_profile?.recommended_features) {
                      const recommended = post.machine_profile.recommended_features;
                      const updatedCaps = [...selectedCapabilityIds];
                      for (const feat of recommended) {
                        if (!updatedCaps.includes(feat)) {
                          updatedCaps.push(feat);
                        }
                      }
                      setSelectedCapabilityIds(updatedCaps);
                    }
                    if (post.machine_profile?.max_rpm) {
                      const profile = post.machine_profile;
                      setProgramName(post.source === "prism_native" ? `PRISM_${post.controller.toUpperCase()}_OPTIMIZED` : `${post.vendor.toUpperCase()}_${post.controller.toUpperCase()}`);
                      if (post.source === "prism_native") {
                        setOutputMode("pipeline_optimized");
                      }
                    }
                    setLane("generate");
                  }
                }
              )
            }
          ),
          lane === "machine" && /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "space-y-6", children: [
            /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
              MachinePickerPanel,
              {
                onFingerprintChange: handleFingerprintChange,
                onManufacturerChange: (m) => setMachineModel((prev) => prev || m),
                onModelChange: (m) => setMachineModel(m)
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
              FeatureTogglePanel,
              {
                fingerprint,
                enabledFeatures,
                onToggle: handleFeatureToggle
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
              ControllerOverridePanel,
              {
                fingerprint,
                controllerOverride,
                onOverrideChange: handleControllerOverride,
                availableControllers: controllers.map((c) => ({
                  value: c.value,
                  label: c.label
                }))
              }
            )
          ] }),
          lane === "programs" && /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "ppg-saber ppg-saber--violet-rose ppg-saber-pulse", children: /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "ppg-saber-inner p-5", children: [
            /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "ppg-saber-sweep" }),
            /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "relative z-10 space-y-4", children: [
              /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "flex items-center justify-between", children: [
                /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "text-lg font-bold text-slate-50", children: "Shop Program Library" }),
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "text-sm text-slate-400", children: [
                    programTotal > 0 ? `${programTotal} programs` : "Loading...",
                    " \u2014 select one to optimize with PRISM physics"
                  ] })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "flex items-center gap-2", children: Object.entries(programStats).map(([ctrl, count]) => /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(
                  "button",
                  {
                    onClick: async () => {
                      setProgramController(ctrl);
                      setProgramLoading(true);
                      try {
                        const res = await ppgProgramsList(ctrl, 0, 50, programSearch);
                        const d = res?.data ?? {};
                        setProgramList(d.programs ?? []);
                        setProgramTotal(d.total ?? 0);
                      } catch {
                      }
                      setProgramLoading(false);
                    },
                    className: `rounded-lg px-3 py-1.5 text-xs font-semibold transition ${programController === ctrl ? "bg-violet-500/25 text-violet-200 border border-violet-500/40" : "text-slate-400 hover:text-slate-200 border border-white/10"}`,
                    children: [
                      ctrl.charAt(0).toUpperCase() + ctrl.slice(1),
                      " (",
                      count,
                      ")"
                    ]
                  },
                  ctrl
                )) })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "flex gap-2", children: [
                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                  Input,
                  {
                    value: programSearch,
                    onChange: (e) => setProgramSearch(e.target.value),
                    placeholder: "Search programs by name or customer..."
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                  ActionButton,
                  {
                    onClick: async () => {
                      setProgramLoading(true);
                      try {
                        const res = await ppgProgramsList(programController, 0, 50, programSearch);
                        const d = res?.data ?? {};
                        setProgramList(d.programs ?? []);
                        setProgramTotal(d.total ?? 0);
                      } catch {
                      }
                      setProgramLoading(false);
                    },
                    children: "Search"
                  }
                )
              ] }),
              programLoading && /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "text-center text-sm text-slate-500 py-8", children: "Loading programs..." }),
              !programLoading && programList.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "text-center text-sm text-slate-500 py-8", children: programTotal === 0 ? "No programs found. Click a controller tab above." : "No matches for your search." }),
              !programLoading && programList.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "max-h-[500px] overflow-auto space-y-1", children: programList.map((prog) => /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(
                "button",
                {
                  onClick: async () => {
                    setProgramLoading(true);
                    try {
                      const res = await ppgProgramLoad(prog.path);
                      const d = res?.data;
                      if (d?.content) {
                        setGcodeInput(d.content);
                        setOriginalGcode(d.content);
                        setFileName(prog.name);
                        setFileSize(prog.size_bytes);
                        autoDetectController(d.content);
                        if (programController === "okuma") {
                          const match = controllers.find((c) => c.value.startsWith("okuma"));
                          if (match) setController(match.value);
                        } else if (programController === "haas") {
                          const match = controllers.find((c) => c.value.startsWith("haas"));
                          if (match) setController(match.value);
                        }
                        setLane("generate");
                      }
                    } catch {
                    }
                    setProgramLoading(false);
                  },
                  className: "flex w-full items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-4 py-2.5 text-left transition hover:border-violet-500/30 hover:bg-violet-500/[0.06]",
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "min-w-0 flex-1", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "text-sm font-semibold text-slate-100 truncate", children: prog.program }),
                      prog.customer && /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "text-xs text-slate-500 truncate", children: prog.customer })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "flex items-center gap-3 shrink-0 ml-3", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("span", { className: "text-xs text-slate-500", children: [
                        (prog.size_bytes / 1024).toFixed(1),
                        " KB"
                      ] }),
                      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { className: "rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold text-violet-300", children: "Load & Optimize" })
                    ] })
                  ]
                },
                prog.path
              )) }),
              programTotal > 50 && !programLoading && /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "text-center text-xs text-slate-500", children: [
                "Showing ",
                Math.min(50, programList.length),
                " of ",
                programTotal,
                " programs \u2014 use search to narrow"
              ] })
            ] })
          ] }) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "space-y-6", children: [
          /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(
            PanelCard,
            {
              title: "Capability verification",
              subtitle: "Match the controller packet to the machine and operation before it escapes into prove-out.",
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "grid gap-3 sm:grid-cols-3", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                    SummaryTile,
                    {
                      label: "Selected",
                      value: String(selectedCapabilityIds.length),
                      hint: "Current packet stack",
                      accent: "from-cyan-400/22 via-cyan-300/10 to-transparent"
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                    SummaryTile,
                    {
                      label: "Required gaps",
                      value: String(missingRequired.length),
                      hint: "Blocking posture mismatches",
                      accent: "from-rose-400/22 via-rose-300/10 to-transparent"
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                    SummaryTile,
                    {
                      label: "Recommended gaps",
                      value: String(missingRecommended.length),
                      hint: "Worth confirming before release",
                      accent: "from-amber-400/22 via-amber-300/10 to-transparent"
                    }
                  )
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "mt-4 flex flex-wrap gap-3", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(ActionButton, { tone: "emerald", onClick: loadRecommendedStack, children: "Load recommended stack" }),
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(ActionButton, { tone: "amber", onClick: selectFullMachineStack, children: "Select full machine stack" })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "mt-5 space-y-3", children: visibleCapabilities.map((option) => {
                  const checked = selectedCapabilityIds.includes(option.id);
                  const required = requiredCapabilityIds.includes(option.id);
                  const recommended = recommendedCapabilityIds.includes(option.id);
                  return /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                    "label",
                    {
                      className: "block rounded-[22px] border border-white/10 bg-white/[0.03] p-4",
                      children: /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "flex items-start gap-3", children: [
                        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                          "input",
                          {
                            type: "checkbox",
                            "aria-label": option.label,
                            checked,
                            onChange: () => toggleCapability(option.id),
                            className: "mt-1 h-4 w-4 rounded border-white/20 bg-slate-950/80 text-cyan-300 focus:ring-cyan-300/40"
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "min-w-0 space-y-2", children: [
                          /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "flex flex-wrap items-center gap-2", children: [
                            /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "text-sm font-semibold text-slate-100", children: option.label }),
                            checked ? /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(StatusPill, { label: "Selected", tone: "sky" }) : null,
                            required ? /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(StatusPill, { label: "Required", tone: "rose" }) : null,
                            recommended ? /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(StatusPill, { label: "Recommended", tone: "amber" }) : null
                          ] }),
                          /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "text-sm text-slate-400", children: option.detail })
                        ] })
                      ] })
                    },
                    option.id
                  );
                }) })
              ]
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(
            PanelCard,
            {
              title: "Release and prove-out posture",
              subtitle: "Treat post generation as a governed packet that must clear machine and controller gates.",
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "grid gap-3 sm:grid-cols-3", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                    SummaryTile,
                    {
                      label: "Packet id",
                      value: packetId,
                      hint: "Stable downstream packet spine",
                      accent: "from-sky-400/22 via-sky-300/10 to-transparent"
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                    SummaryTile,
                    {
                      label: "Recommended tier",
                      value: recommendedTier,
                      hint: "Best commercial fit for this posture",
                      accent: "from-amber-400/22 via-amber-300/10 to-transparent"
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                    SummaryTile,
                    {
                      label: "Readiness",
                      value: readinessSummary,
                      hint: "Current prove-out posture",
                      accent: "from-emerald-400/20 via-emerald-300/10 to-transparent"
                    }
                  )
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "mt-5 space-y-3", children: releaseChecks.map((check) => /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(
                  "div",
                  {
                    className: `rounded-[22px] border p-4 ${readinessRing(check.status)}`,
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "flex flex-wrap items-center justify-between gap-2", children: [
                        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "text-sm font-semibold text-slate-100", children: check.label }),
                        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                          StatusPill,
                          {
                            label: check.status.toUpperCase(),
                            tone: readinessTone(check.status)
                          }
                        )
                      ] }),
                      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "mt-2 text-sm text-slate-300", children: check.detail })
                    ]
                  },
                  check.id
                )) })
              ]
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(
            PanelCard,
            {
              title: "Downstream packet actions",
              subtitle: "Carry the same controller packet into release, quoting, capture, and prove-out instead of rebuilding context by hand.",
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "rounded-[22px] border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300", children: "This desk now acts like a packet spine. Once the controller posture looks good, move the same packet into the rest of PRISM." }),
                /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "mt-4 grid gap-3", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(Link, { className: ACTION_LINK_CLASS, to: releasePath, children: "Open Print to CNC packet" }),
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(Link, { className: ACTION_LINK_CLASS, to: quotePath, children: "Stage quote packet" }),
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(Link, { className: ACTION_LINK_CLASS, to: capturePath, children: "Capture prove-out evidence" }),
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(Link, { className: ACTION_LINK_CLASS, to: shopFloorPath, children: "Start shop-floor prove-out" })
                ] })
              ]
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
            PanelCard,
            {
              title: "Controller + operation library",
              subtitle: "A compact review of the current controller and operation catalogs.",
              children: /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "space-y-4", children: [
                /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "text-xs font-semibold uppercase tracking-[0.18em] text-slate-400", children: "Controllers" }),
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "mt-3 space-y-3", children: controllers.map((item) => /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(
                    "div",
                    {
                      className: "rounded-[20px] border border-white/10 bg-white/[0.03] p-4",
                      children: [
                        /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "flex flex-wrap items-center gap-2", children: [
                          /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "text-sm font-semibold text-slate-100", children: item.label }),
                          item.value === controller ? /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(StatusPill, { label: "Selected", tone: "sky" }) : null,
                          /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(StatusPill, { label: item.family, tone: "slate" })
                        ] }),
                        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "mt-2 text-sm text-slate-400", children: item.note })
                      ]
                    },
                    item.value
                  )) })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "text-xs font-semibold uppercase tracking-[0.18em] text-slate-400", children: "Operation templates" }),
                  /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "mt-3 flex flex-wrap gap-2", children: operations.map((item) => /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                    StatusPill,
                    {
                      label: item.label,
                      tone: item.value === operation ? "emerald" : "slate"
                    },
                    item.value
                  )) })
                ] })
              ] })
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
            PanelCard,
            {
              title: "Post product tiers",
              subtitle: "Current commercial packaging for post work, machine onboarding, and prove-out support.",
              children: /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "space-y-3", children: COVERAGE_TIERS.map((tier) => /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(
                "div",
                {
                  className: "rounded-[22px] border border-white/10 bg-white/[0.03] p-4",
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "flex flex-wrap items-center justify-between gap-2", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { children: [
                        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "text-sm font-semibold text-slate-100", children: tier.label }),
                        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "mt-1 text-sm text-slate-400", children: tier.price })
                      ] }),
                      /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "flex flex-wrap gap-2", children: [
                        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(StatusPill, { label: tier.price, tone: tier.tone }),
                        tier.label === recommendedTier ? /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(StatusPill, { label: "Recommended now", tone: "amber" }) : null
                      ] })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "mt-3 text-sm text-slate-300", children: tier.detail })
                  ]
                },
                tier.label
              )) })
            }
          )
        ] })
      ] })
    ] })
  ] });
}
export {
  PostProcessorGeneratorPage
};
/*! Bundled license information:

react/cjs/react.development.js:
  (**
   * @license React
   * react.development.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

react/cjs/react-jsx-runtime.development.js:
  (**
   * @license React
   * react-jsx-runtime.development.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

react-router/dist/development/chunk-K6AXKMTT.mjs:
  (**
   * react-router v7.1.1
   *
   * Copyright (c) Remix Software Inc.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE.md file in the root directory of this source tree.
   *
   * @license MIT
   *)

react-router/dist/development/index.mjs:
  (**
   * react-router v7.1.1
   *
   * Copyright (c) Remix Software Inc.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE.md file in the root directory of this source tree.
   *
   * @license MIT
   *)
*/
