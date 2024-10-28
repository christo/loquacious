import type {ConfigurableCreator} from "../domain/ConfigurableCreator";
import type {CreatorType} from "../domain/CreatorType";
import type {CanRun} from "./config";

/**
 * Collects common interfaces for services that can create data assets, are configurable and can check their
 * requirements etc.
 */
export interface CreatorService extends CreatorType, ConfigurableCreator, CanRun {

}