import { RunService } from "@rbxts/services";

const DEFAULT_TIMEOUT = 60;

export enum WaitForError {
	Destroyed = "Destroyed",
}

function watchDestroying<T>(instance: Instance, promise: Promise<T>) {
	return Promise.race<T>([
		promise,
		Promise.fromEvent(instance.Destroying).andThen<T>(() => Promise.reject(WaitForError.Destroyed) as Promise<T>),
	]);
}

/**
 * Wait for a child of a given name to exist within a parent. The promise will be rejected if the
 * parent is destroyed or the timeout is reached.
 *
 * ```ts
 * waitForChild(parent, "ChildName").then((child) => {
 * 	print(child.GetFullName());
 * });
 * ```
 *
 * @param parent The parent to look within.
 * @param childName The name of the child.
 * @param recursive Defaults to `false`. If `true`, will find within all descendants of the parent.
 * @param timeout Seconds to wait before timing out. Defaults to 60 seconds.
 * @returns Promise containing the found instance.
 */
export function waitForChild(
	parent: Instance,
	childName: string,
	recursive = false,
	timeout = DEFAULT_TIMEOUT,
): Promise<Instance> {
	const child = parent.FindFirstChild(childName, recursive);
	if (child !== undefined) {
		return Promise.resolve(child);
	}
	return watchDestroying(
		parent,
		Promise.fromEvent(recursive ? parent.DescendantAdded : parent.ChildAdded, (c) => c.Name === childName),
	).timeout(timeout);
}

/**
 * Wait for a child of a given superclass to exist within a parent. The promise will be rejected if the
 * parent is destroyed or the timeout is reached.
 *
 * ```ts
 * waitForChildWhichIsA(parent, "BasePart").then((part) => {
 * 	print(part.GetFullName());
 * });
 * ```
 *
 * @param parent The parent to look within.
 * @param className The superclass name.
 * @param recursive Defaults to `false`. If `true`, will find within all descendants of the parent.
 * @param timeout Seconds to wait before timing out. Defaults to 60 seconds.
 * @returns Promise containing the found instance.
 */
export function waitForChildWhichIsA<T extends keyof Instances>(
	parent: Instance,
	className: T,
	recursive = false,
	timeout = DEFAULT_TIMEOUT,
): Promise<Instance> {
	const child = parent.FindFirstChildWhichIsA(className, recursive);
	if (child !== undefined) {
		return Promise.resolve(child);
	}
	return watchDestroying(
		parent,
		Promise.fromEvent(parent.ChildAdded, (c) => c.IsA(className)),
	).timeout(timeout);
}

/**
 * Wait for a child of a given class to exist within a parent. The promise will be rejected if the
 * parent is destroyed or the timeout is reached.
 *
 * ```ts
 * waitForChildOfClass(parent, "PointLight").then((light) => {
 * 	print(light.GetFullName());
 * });
 * ```
 *
 * @param parent The parent to look within.
 * @param className The class name.
 * @param timeout Seconds to wait before timing out. Defaults to 60 seconds.
 * @returns Promise containing the found instance.
 */
export function waitForChildOfClass<T extends keyof Instances>(
	parent: Instance,
	className: T,
	timeout = DEFAULT_TIMEOUT,
): Promise<Instance> {
	const child = parent.FindFirstChildOfClass(className);
	if (child !== undefined) {
		return Promise.resolve(child);
	}
	return watchDestroying(
		parent,
		Promise.fromEvent(parent.ChildAdded, (c) => c.ClassName === className),
	).timeout(timeout);
}

/**
 * Waits for all children in a parent to exist.
 *
 * ```ts
 * waitForChildren(parent, ["LeftWheel", "RightWheel"]).then((children) => {
 * 	const leftWheel = children[0];
 * 	const rightWheel = children[1];
 * });
 * ```
 *
 * @param parent The parent to look within.
 * @param childrenNames The names of the children instances to find.
 * @param recursive Defaults to `false`. If `true`, will find within all descendants of the parent.
 * @param timeout Seconds to wait before timing out. Defaults to 60 seconds.
 * @returns A promise containing an array of all the children in order of which they appear in the `childrenNames` array.
 */
export function waitForChildren(
	parent: Instance,
	childrenNames: string[],
	recursive = false,
	timeout = DEFAULT_TIMEOUT,
): Promise<Instance[]> {
	const all = table.create<Promise<Instance>>(childrenNames.size());
	const destroying = table.create<RBXScriptConnection>(childrenNames.size());
	let destroyed = false;
	for (const childName of childrenNames) {
		all.push(
			waitForChild(parent, childName, recursive, timeout).then((child) => {
				destroying.push(
					child.Destroying.Connect(() => {
						destroyed = true;
					}),
				);
				return child;
			}),
		);
	}
	return Promise.all(all).then((children) => {
		for (const connection of destroying) {
			connection.Disconnect();
		}
		if (destroyed) {
			return Promise.reject(WaitForError.Destroyed);
		}
		return children;
	}) as Promise<Instance[]>;
}

/**
 * Waits for the PrimaryPart of a model to exist.
 *
 * ```ts
 * waitForPrimaryPart(model).then((primaryPart) => {
 * 	print(primaryPart.GetFullName());
 * });
 * ```
 *
 * @param model The model to await the PrimaryPart.
 * @param timeout Seconds to wait before timing out. Defaults to 60 seconds.
 * @returns A promise containing the PrimaryPart.
 */
export function waitForPrimaryPart(model: Model, timeout = DEFAULT_TIMEOUT): Promise<BasePart> {
	const primary = model.PrimaryPart;
	if (primary !== undefined) {
		return Promise.resolve(primary);
	}
	return watchDestroying(
		model,
		Promise.fromEvent(model.GetPropertyChangedSignal("PrimaryPart"), () => {
			return model.PrimaryPart !== undefined;
		}).then(() => {
			return model.PrimaryPart!;
		}),
	).timeout(timeout);
}

/**
 * Waits for the value of an ObjectValue to exist (i.e. not be `nil`).
 *
 * ```ts
 * waitForObjectValue(objectValue).then((value) => {
 * 	print(value);
 * });
 * ````
 *
 * @param objectValue The ObjectValue to await its Value to not be `nil`.
 * @param timeout Seconds to wait before timing out. Defaults to 60 seconds.
 * @returns A promise containing the ObjectValue's Value.
 */
export function waitForObjectValue(objectValue: ObjectValue, timeout = DEFAULT_TIMEOUT): Promise<Instance> {
	const value = objectValue.Value;
	if (value !== undefined) {
		return Promise.resolve(value);
	}
	return watchDestroying(
		objectValue,
		Promise.fromEvent(objectValue.Changed, (v) => v !== undefined).then(() => objectValue.Value!),
	).timeout(timeout);
}

/**
 * Waits for the given predicate function to return a non-undefined value.
 *
 * The predicate function is called every `RunService.Heartbeat`. As long
 * as the predicate returns `undefined`, it will continue to be called every
 * Heartbeat. Once the predicate returns a non-undefined value of type `T`,
 * the predicate will stop being called and will resolve the promise with the
 * given value.
 *
 * This can be used for more complex waiting strategies that the other `waitFor`
 * functions do not cover.
 *
 * ```ts
 * // e.g. wait for a specific player
 * waitForCustom(() => {
 * 	const me = Players.FindFirstChild("MyUsername") as Player | undefined;
 * 	return me;
 * }).then((me) => {
 * 	print(me);
 * });
 * ```
 *
 * @param predicate A function that will be called every Heartbeat & should return `undefined` until the
 * expected value is available, in which case the predicate should return the value.
 * @param timeout Seconds to wait before timing out. Defaults to 60 seconds.
 * @returns A promise containing the value returned by the predicate function.
 */
export function waitForCustom<T>(predicate: () => T | undefined, timeout = DEFAULT_TIMEOUT): Promise<T> {
	const value = predicate();
	if (value !== undefined) {
		return Promise.resolve(value);
	}
	return new Promise<T>((resolve, reject, onCancel) => {
		const hb = RunService.Heartbeat.Connect(() => {
			const v = predicate();
			if (v !== undefined) {
				hb.Disconnect();
				resolve(v);
			}
		});
		onCancel(() => hb.Disconnect());
	}).timeout(timeout);
}
