# WaitFor

A simple and safe wait to await the existence of instances.

Roblox's instance tree is ever-changing during runtime due to replication, streaming, and other script-driven changes. As such, it is good to have a safe mechanism to grab either individual or batch instances.

## `waitForChild`
```ts
waitForChild<T extends Instance = Instance>(
	parent: Instance,
	childName: string,
	recursive = false,
	timeout = 60,
): Promise<T>
```
Waits for the `childName` child to exist within `parent`. Optionally, a `recursive` flag can be set to search for the child within all descendants of `parent`.

If the `parent` is destroyed, the promise will be rejected with the error `WaitForError.Destroyed`.

```ts
waitForChild(someParent, "SomeChild").then((child) => {
	print(child.GetFullName());
});
```

## `waitForChildWhichIsA`
```ts
waitForChildWhichIsA<T extends keyof Instances>(
	parent: Instance,
	className: T,
	recursive = false,
	timeout = 60,
): Promise<Instance>
```
Waits for the superclass `className` to exist within the `parent`.

```ts
waitForChildWhichIsA(someParent, "BasePart").then((part) => {
	print(part.GetFullName());
});
```

## `waitForChildOfClass`
```ts
waitForChildOfClass<T extends keyof Instances>(
	parent: Instance,
	className: T,
	timeout = 60,
): Promise<Instance>
```
Waits for the given class `className` to exist within the `parent`.

```ts
waitForChildOfClass(someParent, "PointLight").then((light) => {
	print(light.GetFullName());
});
```

## `waitForChildren`
```ts
waitForChildren(
	parent: Instance,
	childrenNames: string[],
	recursive = false,
	timeout = 60,
): Promise<Instance[]>
```
Waits for all children `childrenNames` within `parent`. Once all children are found, a secondary check is done to make sure none of them were destroyed during the waiting process.

The resolved promise contains an array of children in the same order that they were listed in the `childrenNames` array.

```ts
waitForChildren(vehicle, ["LeftWheel", "RightWheel"]).then((children) => {
	const leftWheel = children[0];
	const rightWheel = children[1];
});
```

## `waitForPrimaryPart`
```ts
waitForPrimaryPart(
	model: Model,
	timeout = 60,
): Promise<BasePart>
```
Wait for the PrimaryPart of `model` to exist.

```ts
waitForPrimaryPart(someModel).then((primaryPart) => {
	print(primaryPart.GetFullName());
});
```

## `waitForObjectValue`
```ts
waitForObjectValue<T extends Instance = Instance>(
	objectValue: ObjectValue,
	timeout = 60,
): Promise<Instance>
```
Waits for the value of an ObjectValue to not be `nil`/`undefined`.

```ts
waitForObjectValue(objectValue).then((value) => {
	print(value);
});
```

## `waitForAttribute`
```ts
waitForAttribute<T extends AttributeValue>(
	instance: Instance,
	attributeName: string,
	timeout = DEFAULT_TIMEOUT,
): Promise<T>
```
Waits fot the given attribute to exist.

```ts
waitForAttribute<string>(someInstance, "MyString").then((myStr) => {
	print("MyString", myStr);
});
```

## `waitForCustom`
```ts
waitForCustom<T>(
	predicate: () => T | undefined,
	timeout = 60,
): Promise<T>
```
Waits for the given predicate function to return a non-undefined value.

The predicate function is called every `RunService.Heartbeat`. As long as the predicate function returns `undefined`, it will continue to be called every Heartbeat. Once the predicate returns a non-undefined value of type `T`, the predicate will stop being called and will resolve the promise with the given value.

This can be used for more complex waiting strategies.

```ts
waitForCustom(() => {
	const me = Players.FindFirstChild("MyUsername") as Player | undefined;
	return me;
}).then((me) => {
	print(me);
});
```
